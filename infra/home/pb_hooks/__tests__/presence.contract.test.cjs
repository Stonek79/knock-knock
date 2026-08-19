/**
 * Contract tests for presence.pb.js owner/membership boundary (P0.3b).
 * Captures routerAdd; stubs $app/Record/$os. No network, no Dev/Prod API.
 * Covers: owner-only upsert/heartbeat, forged-record denial, membership-gated
 * typing/read, and privacy-safe shared presence.
 */
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const path = require("node:path");

const HOOKS_DIR = path.resolve(__dirname, "..");
const handlers = {};

globalThis.__hooks = HOOKS_DIR;
globalThis.routerAdd = (method, route, handler) => {
	handlers[`${method} ${route}`] = handler;
};

const DEFAULT_RECORD = (data) => {
	const state = Object.assign(
		{
			id: "pres1",
			encrypted_user_id: "",
			is_online: false,
			is_typing: false,
			room_id: "",
			last_ping: "2026-01-01T00:00:00Z",
		},
		data || {},
	);
	return {
		id: state.id,
		getString: (f) => (typeof state[f] === "string" ? state[f] : ""),
		getBool: (f) => Boolean(state[f]),
		set: (f, v) => {
			state[f] = v;
		},
		toState: () => ({ ...state }),
	};
};

let appStub, recordStub, jsonCalls, savedRecords, createdRecords;

beforeEach(() => {
	jsonCalls = [];
	savedRecords = [];
	createdRecords = [];

	let existingRec = null;
	appStub = {
		findFirstRecordByFilter: () => existingRec,
		findRecordsByFilter: () => [],
		findRecordById: () => null,
		findCollectionByNameOrId: () => ({ name: "presence_status" }),
		save: (r) => {
			savedRecords.push(r);
		},
	};
	recordStub = {
		_controls: {
			setExisting(rec) {
				existingRec = rec;
			},
			setMemberGuard(member) {
				appStub.findRecordsByFilter = () =>
					member ? [{ user: "u1", room: "room1" }] : [];
			},
			getExisting() {
				return existingRec;
			},
		},
	};
	globalThis.$app = appStub;
	globalThis.Record = function Record(collection, data) {
		const rec = DEFAULT_RECORD(data);
		createdRecords.push(rec);
		return rec;
	};
	globalThis.$os = { getenv: () => "" };
	globalThis.console = { log: () => {}, error: () => {}, warn: () => {} };
});

afterEach(() => {
	delete globalThis.$app;
	delete globalThis.Record;
	delete globalThis.$os;
});

function makeE(body, opts = {}) {
	return {
		auth: opts.auth ? { id: opts.auth } : { id: "user1" },
		requestInfo: () => ({ body }),
		request: {
			pathValue: (name) => (opts.pathValue ? opts.pathValue[name] : ""),
		},
		json: (status, payload) => {
			jsonCalls.push({ status, payload });
			return { status, payload };
		},
	};
}

require("../presence.pb.js");

describe("POST /api/custom/presence/me", () => {
	it("creates own presence when none exists", () => {
		const handler = handlers["POST /api/custom/presence/me"];
		const res = handler(makeE({ is_online: true }));
		assert.equal(res.status, 200);
		assert.equal(createdRecords.length, 1, "must create a new record");
		assert.equal(
			createdRecords[0].toState().encrypted_user_id,
			"user1",
		);
		assert.equal(res.payload.is_online, true);
		assert.equal(res.payload.id, "pres1");
	});

	it("rejects when record_id refers to another user's record", () => {
		recordStub._controls.setExisting(
			DEFAULT_RECORD({ id: "otherrec", encrypted_user_id: "user2" }),
		);
		const handler = handlers["POST /api/custom/presence/me"];
		const res = handler(makeE({ is_online: true, record_id: "user1rec" }));
		assert.equal(res.status, 403);
		assert.equal(createdRecords.length, 0);
		assert.equal(savedRecords.length, 0);
	});

	it("rejects missing auth", () => {
		const handler = handlers["POST /api/custom/presence/me"];
		const res = handler({
			auth: null,
			requestInfo: () => ({ body: {} }),
			request: { pathValue: () => "" },
			json: (status, payload) => {
				jsonCalls.push({ status, payload });
				return { status, payload };
			},
		});
		assert.equal(res.status, 401);
	});
describe("POST /api/custom/presence/typing", () => {
	it("denies non-member room with 403", () => {
		recordStub._controls.setMemberGuard(false);
		recordStub._controls.setExisting(
			DEFAULT_RECORD({ id: "ownrec", encrypted_user_id: "user1" }),
		);
		const handler = handlers["POST /api/custom/presence/typing"];
		const res = handler(makeE({ room_id: "roomX", is_typing: true }));
		assert.equal(res.status, 403);
		assert.equal(res.payload.code, "ROOM_ACCESS_DENIED");
		assert.equal(savedRecords.length, 0);
	});

	it("requires room_id when typing", () => {
		recordStub._controls.setMemberGuard(true);
		recordStub._controls.setExisting(
			DEFAULT_RECORD({ id: "ownrec", encrypted_user_id: "user1" }),
		);
		const handler = handlers["POST /api/custom/presence/typing"];
		const res = handler(makeE({ is_typing: true, room_id: "" }));
		assert.equal(res.status, 400);
	});

	it("sets typing for a member room", () => {
		recordStub._controls.setMemberGuard(true);
		const rec = DEFAULT_RECORD({ id: "ownrec", encrypted_user_id: "user1" });
		recordStub._controls.setExisting(rec);
		const handler = handlers["POST /api/custom/presence/typing"];
		const res = handler(makeE({ room_id: "room1", is_typing: true }));
		assert.equal(res.status, 200);
		assert.equal(res.payload.is_typing, true);
		assert.equal(res.payload.room_id, "room1");
	});
});

describe("GET /api/custom/presence/room/:roomId", () => {
	const memberRecord = (user, room) => ({
		user,
		room,
		getString: (f) => (f === "user" ? user : f === "room" ? room : ""),
	});

	it("denies non-member", () => {
		recordStub._controls.setMemberGuard(false);
		const handler = handlers["GET /api/custom/presence/room/:roomId"];
		const res = handler(makeE({}, { pathValue: { roomId: "room1" } }));
		assert.equal(res.status, 403);
	});

	it("returns only safe typing DTO for members", () => {
		appStub.findRecordsByFilter = (table, filter) => {
			if (filter.includes("room_id =")) {
				return [
					DEFAULT_RECORD({
						room_id: "room1",
						is_typing: true,
						encrypted_user_id: "user2",
					}),
				];
			}
			// membership: `room = {:roomId} && user = {:userId}`
			return [memberRecord("user1", "room1")];
		};
		const handler = handlers["GET /api/custom/presence/room/:roomId"];
		const res = handler(makeE({}, { pathValue: { roomId: "room1" } }));
		assert.equal(res.status, 200);
		assert.equal(res.payload.length, 1);
		assert.equal(res.payload[0].user_id, "user2");
	});
});

describe("GET /api/custom/presence/shared", () => {
	it("returns only shared-room presence, never a global list", () => {
		const memberRecord = (user, room) => ({
			user,
			room,
			getString: (f) => (f === "user" ? user : f === "room" ? room : ""),
		});
		const existing = new Map();
		appStub.findRecordsByFilter = (table, filter) => {
			if (table === "room_members" && filter.includes("rid0")) {
				return [memberRecord("user2", "room1")];
			}
			if (table === "room_members") {
				return [memberRecord("user1", "room1")];
			}
			return [];
		};
		appStub.findFirstRecordByFilter = (table, filter, params) =>
			existing.get(params.userId) || null;
		existing.set("user2", DEFAULT_RECORD({ encrypted_user_id: "user2" }));
		existing.set(
			"user1",
			DEFAULT_RECORD({ encrypted_user_id: "user1", is_online: true }),
		);

		const handler = handlers["GET /api/custom/presence/shared"];
		const res = handler(makeE({}));
		assert.equal(res.status, 200);
		const ids = res.payload.map((r) => r.user_id).sort();
		assert.deepEqual(ids, ["user1", "user2"]);
	});
});
});
