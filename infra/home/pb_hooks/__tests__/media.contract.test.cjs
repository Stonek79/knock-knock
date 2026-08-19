/**
 * Contract tests for media server boundary (P0.3b): media_validation.js (pure)
 * and media.pb.js onRecordCreateRequest hook. No network, no Dev/Prod API.
 */
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const path = require("node:path");

const HOOKS_DIR = path.resolve(__dirname, "..");
const validation = require("../media_validation.js");

const MB = 1024 * 1024;

describe("media_validation.js (pure validator)", () => {
	it("accepts allowed image/video/audio/document within size limit", () => {
		assert.deepEqual(
			validation.validateMediaUpload({
				mime: "image/png",
				sizeBytes: 5 * MB,
			}),
			{ ok: true },
		);
		assert.deepEqual(
			validation.validateMediaUpload({
				mime: "video/webm",
				sizeBytes: 29 * MB,
			}),
			{ ok: true },
		);
		assert.deepEqual(
			validation.validateMediaUpload({
				mime: "audio/webm",
				sizeBytes: 15 * MB,
			}),
			{ ok: true },
		);
		assert.deepEqual(
			validation.validateMediaUpload({
				mime: "application/pdf",
				sizeBytes: 50 * MB,
			}),
			{ ok: true },
		);
	});

	it("rejects disallowed MIME even if client declares it", () => {
		const res = validation.validateMediaUpload({
			mime: "text/html",
			sizeBytes: 100,
		});
		assert.equal(res.ok, false);
		assert.equal(res.code, "UNSUPPORTED_MIME");
	});

	it("rejects oversized files regardless of client-side limits", () => {
		const res = validation.validateMediaUpload({
			mime: "image/png",
			sizeBytes: 11 * MB,
		});
		assert.equal(res.ok, false);
		assert.equal(res.code, "FILE_TOO_LARGE");
	});

	it("rejects declared type that mismatches actual MIME", () => {
		const res = validation.validateMediaUpload({
			mime: "image/png",
			sizeBytes: 100,
			declaredType: "document",
		});
		assert.equal(res.ok, false);
		assert.equal(res.code, "MIME_TYPE_MISMATCH");
	});

	it("rejects a missing or non-numeric size", () => {
		for (const sizeBytes of [undefined, "not-a-number"]) {
			const res = validation.validateMediaUpload({
				mime: "image/png",
				sizeBytes,
			});
			assert.equal(res.ok, false);
			assert.equal(res.code, "INVALID_SIZE");
		}
	});
});

describe("media.pb.js → onRecordCreateRequest (media)", () => {
	class BadRequestErrorT extends Error {
		constructor(m) {
			super(m);
			this.name = "BadRequestError";
		}
	}
	class ForbiddenErrorT extends Error {
		constructor(m) {
			super(m);
			this.name = "ForbiddenError";
		}
	}

	let onRecordCreateHooks, onRecordUpdateHooks, memberOk, filePlaceholder;

	beforeEach(() => {
		memberOk = true;
		onRecordCreateHooks = [];
		onRecordUpdateHooks = [];
		filePlaceholder = { name: "enc_a.png", type: "image/png", size: 1024 };
		globalThis.__hooks = HOOKS_DIR;
		globalThis.onRecordCreateRequest = (fn, collection) =>
			onRecordCreateHooks.push({ fn, collection });
		globalThis.onRecordUpdateRequest = (fn, collection) =>
			onRecordUpdateHooks.push({ fn, collection });
		globalThis.BadRequestError = BadRequestErrorT;
		globalThis.ForbiddenError = ForbiddenErrorT;
		globalThis.$app = {
			findRecordsByFilter: () => (memberOk ? [{ id: "m1" }] : []),
		};
		delete require.cache[require.resolve("../media.pb.js")];
		require("../media.pb.js");
	});

	afterEach(() => {
		delete globalThis.__hooks;
		delete globalThis.onRecordCreateRequest;
		delete globalThis.onRecordUpdateRequest;
		delete globalThis.BadRequestError;
		delete globalThis.ForbiddenError;
		delete globalThis.$app;
	});

	function makeRecord({ createdBy, room, type, isVault }) {
		const state = {
			created_by: createdBy || "user1",
			room: room || "",
			type: type || "image",
			is_vault: isVault || false,
		};
		return {
			collection: () => ({ name: "media" }),
			get: (f) => (f === "file" ? filePlaceholder : state[f]),
			getString: (f) => (typeof state[f] === "string" ? state[f] : ""),
			getBool: (f) => Boolean(state[f]),
		};
	}

	function runHook(record, authId) {
		return new Promise((resolve) => {
			let passed = false;
			let error = null;
			const e = {
				auth: authId ? { id: authId, collection: () => ({ name: "users" }) } : null,
				record,
					next: () => {
						passed = true;
					},
					findUploadedFiles: () => [filePlaceholder],
				};
			try {
				onRecordCreateHooks.find((h) => h.collection === "media").fn(e);
			} catch (err) {
				error = err;
			}
			resolve({ passed, error });
		});
	}

	it("superuser path still enforces server MIME/size", async () => {
		filePlaceholder = { type: "text/html", size: 10 };
		const superE = {
			auth: { id: "s1", collection: () => ({ name: "_superusers" }) },
			record: makeRecord({ room: "", isVault: true }),
			next: () => {},
			findUploadedFiles: () => [filePlaceholder],
		};
		assert.throws(
			() =>
				onRecordCreateHooks
					.find((h) => h.collection === "media")
					.fn(superE),
			/could not|не поддержив|Error/,
		);
	});

	it("rejects forged created_by (regular user)", async () => {
		const { error } = await runHook(makeRecord({ createdBy: "user2" }), "user1");
		assert.ok(error instanceof ForbiddenErrorT, "must be Forbidden");
	});

	it("rejects regular-user vault media", async () => {
		const { error } = await runHook(
			makeRecord({ isVault: true, room: "room1" }),
			"user1",
		);
		assert.ok(error instanceof ForbiddenErrorT);
	});

	it("rejects chat media without a room relation", async () => {
		const { error } = await runHook(makeRecord({ room: "" }), "user1");
		assert.ok(error instanceof BadRequestErrorT);
	});

	it("rejects media for a non-member room", async () => {
		memberOk = false;
		const { error } = await runHook(makeRecord({ room: "roomX" }), "user1");
		assert.ok(error instanceof ForbiddenErrorT);
	});

	it("allows a member to create chat media with valid file", async () => {
		const { passed, error } = await runHook(
			makeRecord({ room: "room1" }),
			"user1",
		);
		assert.equal(error, null);
		assert.equal(passed, true);
	});

	it("reads MIME and size from the request upload, not record.file", async () => {
		const record = makeRecord({ room: "room1" });
		record.get = (field) => (field === "file" ? "enc_a.png" : "");
		const { passed, error } = await runHook(record, "user1");
		assert.equal(error, null);
		assert.equal(passed, true);
	});

	it("rejects disallowed MIME for chat media", async () => {
		filePlaceholder = { type: "text/html", size: 10 };
		const { error } = await runHook(makeRecord({ room: "room1" }), "user1");
		assert.ok(error instanceof BadRequestErrorT);
	});

	it("rejects a system-broadcast marker from a regular upload", async () => {
		const record = makeRecord({ room: "room1" });
		record.get = (field) => {
			if (field === "references") {
				return { isSystemBroadcast: true };
			}
			return field === "file" ? filePlaceholder : "";
		};
		const { error } = await runHook(record, "user1");
		assert.ok(error instanceof ForbiddenErrorT);
	});

	it("does not allow a regular owner to forge the system-broadcast marker on update", () => {
		const record = makeRecord({ room: "room1" });
		record.get = (field) =>
			field === "references" ? { isSystemBroadcast: true } : filePlaceholder;
		const hook = onRecordUpdateHooks.find((h) => h.collection === "media");
		assert.ok(hook, "media update hook must be registered");
		assert.throws(
			() =>
				hook.fn({
					auth: { id: "user1", collection: () => ({ name: "users" }) },
					record,
					next: () => {},
				}),
			ForbiddenErrorT,
		);
	});
});
