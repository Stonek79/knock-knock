/**
 * Invite registration/schema contract tests.
 * These tests load hooks with local doubles only; no PocketBase/API is used.
 */
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const HOOKS_DIR = path.resolve(__dirname, "..");
const schema = require(path.resolve(HOOKS_DIR, "../pb_schema.json"));

function record(data = {}) {
	return {
		id: data.id || "invite-1",
		get: (field) => data[field],
		set: (field, value) => {
			data[field] = value;
		},
	};
}

function loadRegistrationHook() {
	let callback;
	globalThis.__hooks = HOOKS_DIR;
	globalThis.onRecordCreateRequest = (registered, collection) => {
		assert.equal(collection, "users");
		callback = registered;
	};
	globalThis.$security = {
		randomString: () => "local-token-key",
	};
	globalThis.$errors = {
		badRequest: (message) => new Error(message),
	};
	const resolved = require.resolve(path.join(HOOKS_DIR, "main.02-registration.pb.js"));
	delete require.cache[resolved];
	require(resolved);
	return callback;
}

function runRegistration({ input, invite, atomicResult = 1 }) {
	const callback = loadRegistrationHook();
	const user = record();
	let nextCalled = false;
	let consumed = false;
	let atomicUpdates = 0;
	const event = {
		record: user,
		requestInfo: () => ({ Data: { invite_code: input } }),
		hasSuperuserAuth: () => false,
		get: () => false,
		app: {
			findRecordsByFilter: () => (invite ? [invite] : []),
			db: () => ({
				newQuery: () => ({
					bind: () => ({
							execute: () => {
							atomicUpdates += 1;
							if (atomicResult === 0) {
								return { rowsAffected: () => 0 };
							}
							if (consumed) {
								return { rowsAffected: () => 0 };
							}
							consumed = true;
							invite?.set("uses_count", Number(invite.get("uses_count") || 0) + 1);
							return { rowsAffected: () => 1 };
						},
					}),
				}),
			}),
			saveNoValidate: () => undefined,
		},
		next: () => {
			nextCalled = true;
		},
	};
	try {
		callback(event);
		return { user, nextCalled, atomicUpdates, error: null };
	} catch (error) {
		return { user, nextCalled, atomicUpdates, error };
	}
}

describe("invite schema contract", () => {
	it("uses token as the only secret and denies direct list/view", () => {
		const invites = schema.find((collection) => collection.name === "invites");
		assert.ok(invites);
		assert.equal(invites.listRule, null);
		assert.equal(invites.viewRule, null);
		assert.equal(invites.fields.find((field) => field.name === "room").required, false);
		assert.ok(invites.fields.some((field) => field.name === "token"));
		assert.equal(invites.fields.some((field) => field.name === "code"), false);
		assert.equal(invites.fields.some((field) => field.name === "status"), false);
	});

	it("accepts a valid registration invite and stores only its id", () => {
		const token = "kk-123456789012345678901234567890";
		const invite = record({
			token,
			expires_at: new Date(Date.now() + 60_000).toISOString(),
			max_uses: 1,
			uses_count: 0,
			room: "",
		});
		const result = runRegistration({ input: token, invite });
		assert.equal(result.error, null);
		assert.equal(result.nextCalled, true);
		assert.equal(result.atomicUpdates, 1);
		assert.equal(result.user.get("invite_code"), invite.id);
		assert.equal(invite.get("uses_count"), 1);
	});

	it("rejects registration when atomic invite consumption is unavailable", () => {
		const token = "kk-123456789012345678901234567890";
		const invite = record({
			token,
			expires_at: "",
			max_uses: 1,
			uses_count: 0,
			room: "",
		});
		const callback = loadRegistrationHook();
		const event = {
			record: record(),
			requestInfo: () => ({ Data: { invite_code: token } }),
			hasSuperuserAuth: () => false,
			get: () => false,
			app: {
				findRecordsByFilter: () => [invite],
				saveNoValidate: () => {
					throw new Error("database unavailable");
				},
			},
			next: () => {
				throw new Error("next must not be called");
			},
		};
		assert.throws(
			() => callback(event),
			(error) => error instanceof Error && error.message === "Invite unavailable",
		);
	});

	it("rejects registration when the conditional usage update loses the race", () => {
		const invite = record({
			token: "kk-123456789012345678901234567890",
			expires_at: "",
			max_uses: 1,
			uses_count: 0,
			room: "",
		});
		const result = runRegistration({
			input: invite.get("token"),
			invite,
			atomicResult: 0,
		});
		assert.equal(result.nextCalled, false);
		assert.equal(result.atomicUpdates, 1);
		assert.equal(result.error?.message, "Invite limit reached");
	});

	for (const [name, invite] of [
		["expired", record({ expires_at: new Date(Date.now() - 1).toISOString(), max_uses: 1, uses_count: 0, room: "" })],
		["exhausted", record({ expires_at: "", max_uses: 1, uses_count: 1, room: "" })],
		["foreign room invite", record({ expires_at: "", max_uses: 1, uses_count: 0, room: "room-1" })],
		["corrupt usage limit", record({ expires_at: "", max_uses: "invalid", uses_count: 0, room: "" })],
	]) {
		it(`rejects ${name} invites fail-closed`, () => {
			const result = runRegistration({
				input: "kk-123456789012345678901234567890",
				invite,
			});
			assert.ok(result.error);
			assert.equal(result.nextCalled, false);
			assert.equal(result.user.get("invite_code"), undefined);
		});
	}

	it("rejects missing, malformed and unknown invites", () => {
		for (const input of [undefined, "short", "' || token != '' || token = '"]) {
			const result = runRegistration({ input, invite: null });
			assert.ok(result.error);
			assert.equal(result.nextCalled, false);
		}
	});

	it("does not log the supplied invite token", () => {
		const source = fs.readFileSync(
			path.join(HOOKS_DIR, "main.02-registration.pb.js"),
			"utf8",
		);
		assert.doesNotMatch(source, /console\.error\([^\n]*inviteToken/);
		assert.doesNotMatch(source, /console\.error\([^\n]*inviteCodeRaw/);
	});
});

describe("invite generation route contract", () => {
	it("creates a token-compatible registration invite with TTL and one use", () => {
		let routeHandler;
		globalThis.__hooks = HOOKS_DIR;
		globalThis.$apis = { requireAuth: () => Symbol("auth") };
		globalThis.routerAdd = (method, route, handler) => {
			if (method === "POST" && route === "/api/custom/invites/generate") {
				routeHandler = handler;
			}
		};
		const resolved = require.resolve(path.join(HOOKS_DIR, "main.07-invites.pb.js"));
		delete require.cache[resolved];
		require(resolved);

		const values = {};
		globalThis.Record = class {
			constructor() {
				this.id = "generated-invite";
			}
			set(field, value) {
				values[field] = value;
			}
		};
		globalThis.$security = { randomString: () => "a".repeat(32) };
		globalThis.$app = {
			findRecordsByFilter: () => [],
			findCollectionByNameOrId: () => ({}),
			save: () => undefined,
		};
		const result = routeHandler({
			auth: { id: "owner-1", collection: () => ({ name: "users" }) },
			json: (status, body) => ({ status, body }),
		});
		assert.equal(result.status, 200);
		assert.equal(result.body.code, values.token);
		assert.match(values.token, /^[A-Za-z0-9_-]{16,64}$/);
		assert.equal(values.max_uses, 1);
		assert.equal(values.uses_count, 0);
		assert.equal(typeof values.expires_at, "string");
		assert.equal(values.room, undefined);

		delete globalThis.__hooks;
		delete globalThis.$apis;
		delete globalThis.routerAdd;
		delete globalThis.Record;
		delete globalThis.$security;
		delete globalThis.$app;
	});
});

describe("room invite join error contract", () => {
	it("uses only defined privacy-safe error logging", () => {
		const source = fs.readFileSync(
			path.join(HOOKS_DIR, "invites.pb.js"),
			"utf8",
		);
		assert.doesNotMatch(source, /\blogError\s*\(/);
		assert.doesNotMatch(source, /console\.error\([^\n]*(?:token|roomKeyEncrypted|err)/);
	});

	function loadJoinHandler() {
		let handler;
		globalThis.__hooks = HOOKS_DIR;
		globalThis.$apis = { requireAuth: () => Symbol("auth") };
		globalThis.routerAdd = (method, route, registered) => {
			if (method === "POST" && route === "/api/invites/join") {
				handler = registered;
			}
		};
		globalThis.BadRequestError = class extends Error {};
		globalThis.UnauthorizedError = class extends Error {};
		globalThis.NotFoundError = class extends Error {};
		const resolved = require.resolve(path.join(HOOKS_DIR, "invites.pb.js"));
		delete require.cache[resolved];
		require(resolved);
		return handler;
	}

	function eventWith(app) {
		globalThis.$app = app;
		return {
			requestInfo: () => ({
				body: {
					token: "kk-123456789012345678901234567890",
					roomKeyEncrypted: "encrypted-room-key",
				},
			}),
			auth: { id: "user-1", collection: () => ({ name: "users" }) },
			app,
			json: (status, body) => ({ status, body }),
		};
	}

	function invite() {
		return {
			id: "invite-1",
			get: (field) => (field === "expires_at" ? "" : undefined),
			getInt: (field) => (field === "max_uses" ? 1 : 0),
			getString: (field) => (field === "room" ? "room-1" : ""),
			set: () => undefined,
		};
	}

	it("writes the encrypted room key to the schema field", () => {
		const handler = loadJoinHandler();
		const values = {};
		globalThis.Record = class {
			set(field, value) {
				values[field] = value;
			}
		};
		const app = {
			findFirstRecordByData: () => invite(),
			runInTransaction: (callback) =>
				callback({
					db: () => ({
						newQuery: () => ({
							bind: () => ({ execute: () => ({ rowsAffected: () => 1 }) }),
						}),
					}),
					findRecordsByFilter: () => [],
					findCollectionByNameOrId: () => ({}),
					saveNoValidate: () => undefined,
				}),
		};
		try {
			const result = handler(eventWith(app));
			assert.equal(result.status, 200);
			assert.equal(values.encrypted_key, "encrypted-room-key");
			assert.equal(values.key, undefined);
		} finally {
			cleanup();
		}
	});

	it("rejects a room join when the conditional usage update loses the race", () => {
		const handler = loadJoinHandler();
		globalThis.Record = class {
			set() {}
		};
		const app = {
			findFirstRecordByData: () => invite(),
			runInTransaction: (callback) =>
				callback({
					db: () => ({
						newQuery: () => ({
							bind: () => ({
								execute: () => ({ rowsAffected: () => 0 }),
							}),
						}),
					}),
					findRecordsByFilter: () => [],
				}),
		};
		try {
			assert.throws(() => handler(eventWith(app)),
				(error) =>
					error instanceof globalThis.BadRequestError &&
					error.message === "Invite limit reached",
			);
		} finally {
			cleanup();
		}
	});

	function cleanup() {
		for (const name of [
			"__hooks",
			"$apis",
			"routerAdd",
			"BadRequestError",
			"UnauthorizedError",
			"NotFoundError",
			"$app",
			"Record",
		]) {
			delete globalThis[name];
		}
	}

	it("lookup failure returns NotFoundError, not ReferenceError", () => {
		const handler = loadJoinHandler();
		try {
			assert.throws(
				() =>
					handler(
						eventWith({
							findFirstRecordByData: () => {
								throw new Error("database unavailable");
							},
						}),
				),
				(error) =>
					error instanceof globalThis.NotFoundError &&
					error.message === "Invite not found",
			);
		} finally {
			cleanup();
		}
	});

	it("rejects a corrupt expiration date", () => {
		const handler = loadJoinHandler();
		try {
			assert.throws(
				() =>
					handler(
						eventWith({
							findFirstRecordByData: () => ({
								get: (field) =>
									field === "expires_at" ? "not-a-date" : undefined,
								getInt: (field) => (field === "max_uses" ? 1 : 0),
								getString: (field) =>
									field === "room" ? "room-1" : "",
							}),
						}),
					),
				(error) =>
					error instanceof globalThis.BadRequestError &&
					error.message === "Invite expired",
			);
		} finally {
			cleanup();
		}
	});

	for (const [stage, findRecordsByFilter] of [
		["member", () => {
			throw new Error("database unavailable");
		}],
		["key", (() => {
			let call = 0;
			return () => {
				call += 1;
				if (call === 1) return [];
				throw new Error("database unavailable");
			};
		})()],
	]) {
		it(`${stage} lookup failure fails closed without ReferenceError`, () => {
			const handler = loadJoinHandler();
			globalThis.Record = class {
				set() {}
			};
			try {
				assert.throws(
					() =>
						handler(
							eventWith({
								findFirstRecordByData: () => invite(),
								runInTransaction: (callback) =>
					callback({
						db: () => ({
						newQuery: () => ({
							bind: () => ({ execute: () => ({ rowsAffected: () => 1 }) }),
						}),
					}),
					findRecordsByFilter,
										saveNoValidate: () => undefined,
										findCollectionByNameOrId: () => ({}),
									}),
							}),
						),
						(error) =>
							error instanceof Error &&
							error.name !== "ReferenceError" &&
							error.message === "Invite join failed",
					);
			} finally {
				cleanup();
			}
		});
	}

	it("room invite flow keeps the room branch for member and key records", () => {
		const handler = loadJoinHandler();
		const created = [];
		globalThis.Record = class {
			constructor() {
				const values = {};
				created.push(values);
				this.set = (field, value) => {
					values[field] = value;
				};
			}
		};
		try {
			const result = handler(
				eventWith({
					findFirstRecordByData: () => invite(),
					runInTransaction: (callback) =>
					callback({
						db: () => ({
						newQuery: () => ({
							bind: () => ({ execute: () => ({ rowsAffected: () => 1 }) }),
						}),
					}),
					findRecordsByFilter: () => [],
							saveNoValidate: () => undefined,
							findCollectionByNameOrId: () => ({}),
						}),
				}),
			);
			assert.deepEqual(result, {
				status: 200,
				body: { success: true, room: "room-1" },
			});
			assert.equal(created.length, 2);
			assert.equal(created[0].room, "room-1");
			assert.equal(created[1].room, "room-1");
		} finally {
			cleanup();
		}
	});
});
describe("invite validate route contract", () => {
	function loadValidateHandler() {
		let handler;
		globalThis.$apis = { requireAuth: () => Symbol("auth") };
		globalThis.routerAdd = (method, route, registered) => {
			if (method === "POST" && route === "/api/custom/invites/validate") {
				handler = registered;
			}
		};
		const resolved = require.resolve(
			path.join(HOOKS_DIR, "main.07-invites.pb.js"),
		);
		delete require.cache[resolved];
		require(resolved);
		delete globalThis.$apis;
		delete globalThis.routerAdd;
		return handler;
	}

	function inviteRecord(overrides = {}) {
		const data = {
			id: "invite-1",
			expires_at: new Date(Date.now() + 60_000).toISOString(),
			max_uses: 1,
			uses_count: 0,
			room: "room-1",
			...overrides,
		};
		return {
			id: data.id,
			get: (field) => data[field],
		};
	}

	function roomRecord(overrides = {}) {
		const fields = {
			id: "room-1",
			name: "Commander Chat",
			type: "group",
			visibility: "private",
			avatar: "http://avatar/x.png",
			description: "desc",
			...overrides,
		};
		return {
			id: fields.id,
			get: (field) => fields[field],
		};
	}

	function validateEvent(app, token = "kk-123456789012345678901234567890") {
		globalThis.$app = app;
		return {
			requestInfo: () => ({ body: { token } }),
			json: (status, body) => ({ status, body }),
		};
	}

	function cleanupApp() {
		delete globalThis.$app;
	}

	it("returns an allowlist DTO for a valid room invite", () => {
		const handler = loadValidateHandler();
		const invite = inviteRecord();
		const room = roomRecord();
		const app = {
			findRecordsByFilter: () => [invite],
			findRecordById: () => room,
		};
		try {
			const result = handler(validateEvent(app));
			assert.equal(result.status, 200);
			assert.equal(result.body.id, "invite-1");
			assert.equal(result.body.room, "room-1");
			assert.equal(result.body.expires_at, invite.get("expires_at"));
			assert.equal(result.body.max_uses, 1);
			assert.equal(result.body.uses_count, 0);
			assert.equal(result.body.expand.room.id, "room-1");
			assert.equal(result.body.expand.room.name, "Commander Chat");
			assert.equal(result.body.expand.room.type, "group");
		} finally {
			cleanupApp();
		}
	});

	it("rejects an expired invite fail-closed (404)", () => {
		const handler = loadValidateHandler();
		const app = {
			findRecordsByFilter: () => [
				inviteRecord({
					expires_at: new Date(Date.now() - 1).toISOString(),
				}),
			],
			findRecordById: () => roomRecord(),
		};
		try {
			const result = handler(validateEvent(app));
			assert.equal(result.status, 404);
		} finally {
			cleanupApp();
		}
	});

	it("rejects an exhausted invite fail-closed (404)", () => {
		const handler = loadValidateHandler();
		const app = {
			findRecordsByFilter: () => [
				inviteRecord({ max_uses: 1, uses_count: 1 }),
			],
			findRecordById: () => roomRecord(),
		};
		try {
			const result = handler(validateEvent(app));
			assert.equal(result.status, 404);
		} finally {
			cleanupApp();
		}
	});

	it("rejects a registration invite without room (404)", () => {
		const handler = loadValidateHandler();
		const app = {
			findRecordsByFilter: () => [inviteRecord({ room: "" })],
			findRecordById: () => roomRecord(),
		};
		try {
			const result = handler(validateEvent(app));
			assert.equal(result.status, 404);
		} finally {
			cleanupApp();
		}
	});

	it("rejects a non-existent room as not found (404)", () => {
		const handler = loadValidateHandler();
		const app = {
			findRecordsByFilter: () => [inviteRecord()],
			findRecordById: () => {
				throw new Error("room does not exist");
			},
		};
		try {
			const result = handler(validateEvent(app));
			assert.equal(result.status, 404);
		} finally {
			cleanupApp();
		}
	});
it("rejects missing and malformed tokens without touching storage", () => {
		const handler = loadValidateHandler();
		const app = {
			findRecordsByFilter: () => {
				throw new Error("must not be called");
			},
		};
		try {
			// Токен отсутствует в body.
			let result = handler({
				requestInfo: () => ({ body: {} }),
				json: (status, body) => ({ status, body }),
			});
			assert.equal(result.status, 404);

			for (const token of [
				"short",
				"' || token != '' || token = '",
				"a".repeat(70),
			]) {
				result = handler(validateEvent(app, token));
				assert.equal(result.status, 404);
			}
		} finally {
			cleanupApp();
		}
	});

	it("never returns token or created_by in the response", () => {
		const handler = loadValidateHandler();
		const app = {
			findRecordsByFilter: () => [inviteRecord()],
			findRecordById: () => roomRecord(),
		};
		try {
			const result = handler(validateEvent(app));
			assert.equal(result.status, 200);
			assert.ok(!("token" in result.body), "token must not leak");
			assert.ok(
				!("created_by" in result.body),
				"created_by must not leak",
			);
			assert.ok(
				!("token" in result.body.expand.room),
				"room.token must not leak",
			);
		} finally {
			cleanupApp();
		}
	});

	it("returns exactly the allowlist of DTO fields", () => {
		const handler = loadValidateHandler();
		const app = {
			findRecordsByFilter: () => [inviteRecord()],
			findRecordById: () => roomRecord(),
		};
		try {
			const result = handler(validateEvent(app));
			assert.equal(result.status, 200);
			assert.deepEqual(
				Object.keys(result.body).sort(),
				[
					"expires_at",
					"id",
					"max_uses",
					"room",
					"uses_count",
					"expand",
				].sort(),
			);
		} finally {
			cleanupApp();
		}
	});
});

describe("invite concurrent-use atomicity", () => {
	it("accepts one conditional update and rejects the next affected-row miss", () => {
		globalThis.__hooks = HOOKS_DIR;
		const statements = [];
		let usesCount = 0;
		const app = {
			db: () => ({
				newQuery: (sql) => {
					statements.push(sql);
					return {
						bind: () => ({
							execute: () => {
								if (usesCount >= 1) return { rowsAffected: () => 0 };
								usesCount += 1;
								return { rowsAffected: () => 1 };
							},
						}),
					};
				},
			}),
		};
		const { consumeInviteAtomically } = require(
			path.join(HOOKS_DIR, "invite_consumption.js"),
		);

		assert.equal(consumeInviteAtomically(app, "invite-1", { room: "" }), true);
		assert.equal(consumeInviteAtomically(app, "invite-1", { room: "" }), false);
		assert.equal(statements.length, 2);
		assert.match(statements[0], /UPDATE invites/);
		assert.match(statements[0], /uses_count\s*=\s*COALESCE\(uses_count, 0\) \+ 1/);
		assert.match(statements[0], /COALESCE\(uses_count, 0\) < COALESCE\(max_uses, 0\)/);
		assert.match(statements[0], /COALESCE\(room, ''\) = \{:room\}/);
	});
});
