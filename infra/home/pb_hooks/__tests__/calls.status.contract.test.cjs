/**
 * Contract tests for call status transitions (P0.3b).
 * Captures routerAdd; stubs $app/Record. No network, no Dev/Prod API.
 * Verifies: membership/room-consistency, allowed transitions, deterministic
 * errors, safe DTO, and no raw/gateway data in responses.
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
require("../calls.pb.js");

let appStub, callRecordState, jsonCalls, savedRecords;

const makeCallRecord = (state) => {
	callRecordState = Object.assign(
		{
			id: "call1",
			room: "room1",
			initiator: "user1",
			status: "ringing",
			ended_at: "",
		},
		state || {},
	);
	return {
		id: callRecordState.id,
		getString: (f) => (typeof callRecordState[f] === "string" ? callRecordState[f] : ""),
		set: (f, v) => {
			callRecordState[f] = v;
		},
	};
};

beforeEach(() => {
	jsonCalls = [];
	savedRecords = [];
	const record = makeCallRecord();
	appStub = {
		findRecordById: () => record,
		findRecordsByFilter: () => [{ id: "m1" }], // membership ok
		save: (rec) => {
			savedRecords.push(rec);
		},
	};
	globalThis.$app = appStub;
	globalThis.console = { log: () => {}, error: () => {}, warn: () => {} };
});

afterEach(() => {
	delete globalThis.$app;
});

function makeE(body, userId = "user1") {
	return {
		auth: { id: userId },
		requestInfo: () => ({ body }),
		json: (status, payload) => {
			jsonCalls.push({ status, payload });
			return { status, payload };
		},
	};
}

describe("POST /api/calls/status", () => {
	it("allows the invited member to advance ringing → ongoing with safe DTO", () => {
		const handler = handlers["POST /api/calls/status"];
		const res = handler(
			makeE({ call_log_id: "call1", status: "ongoing" }, "user2"),
		);
		assert.equal(res.status, 200);
		assert.deepEqual(res.payload, { success: true, id: "call1", status: "ongoing" });
		assert.equal(callRecordState.status, "ongoing");
		assert.equal(savedRecords.length, 1);
	});

	it("allows ringing → missed / rejected / ended", () => {
		const handler = handlers["POST /api/calls/status"];
		makeCallRecord({
			id: "call1",
			room: "room1",
			initiator: "user1",
			status: "ringing",
		});
		const res = handler(
			makeE({ call_log_id: "call1", status: "missed" }, "user2"),
		);
		assert.equal(res.status, 200);
		assert.equal(callRecordState.ended_at !== "", true);
	});

	it("denies a non-member", () => {
		appStub.findRecordsByFilter = () => [];
		const handler = handlers["POST /api/calls/status"];
		const res = handler(makeE({ call_log_id: "call1", status: "ended" }));
		assert.equal(res.status, 403);
		assert.equal(res.payload.code, "CALL_ACCESS_DENIED");
		assert.equal(savedRecords.length, 0);
	});

	it("rejects unknown call log id deterministically", () => {
		appStub.findRecordById = () => null;
		const handler = handlers["POST /api/calls/status"];
		const res = handler(makeE({ call_log_id: "unknown", status: "ended" }));
		assert.equal(res.status, 404);
		assert.equal(res.payload.code, "NOT_FOUND");
		assert.equal(savedRecords.length, 0);
	});

	it("rejects invalid status value", () => {
		const handler = handlers["POST /api/calls/status"];
		const res = handler(makeE({ call_log_id: "call1", status: "hacked" }));
		assert.equal(res.status, 400);
		assert.equal(res.payload.code, "INVALID_STATUS");
		assert.equal(savedRecords.length, 0);
	});

	it("rejects illegal transition (ended is terminal)", () => {
		makeCallRecord({ id: "call1", room: "room1", status: "ended" });
		const handler = handlers["POST /api/calls/status"];
		const res = handler(makeE({ call_log_id: "call1", status: "ongoing" }));
		assert.equal(res.status, 409);
		assert.equal(res.payload.code, "INVALID_TRANSITION");
		assert.equal(savedRecords.length, 0);
	});

	it("prevents the initiator from marking a ringing call as accepted", () => {
		const handler = handlers["POST /api/calls/status"];
		const res = handler(
			makeE({ call_log_id: "call1", status: "ongoing" }, "user1"),
		);
		assert.equal(res.status, 403);
		assert.equal(res.payload.code, "CALL_ACTOR_FORBIDDEN");
		assert.equal(savedRecords.length, 0);
	});

	it("allows either room participant to end an ongoing call", () => {
		makeCallRecord({
			id: "call1",
			room: "room1",
			initiator: "user1",
			status: "ongoing",
		});
		const handler = handlers["POST /api/calls/status"];
		const res = handler(
			makeE({ call_log_id: "call1", status: "ended" }, "user2"),
		);
		assert.equal(res.status, 200);
		assert.equal(callRecordState.status, "ended");
	});

	it("rejects missing auth", () => {
		const handler = handlers["POST /api/calls/status"];
		const res = handler({
			auth: null,
			requestInfo: () => ({ body: { call_log_id: "call1", status: "ended" } }),
			json: (status, payload) => {
				jsonCalls.push({ status, payload });
				return { status, payload };
			},
		});
		assert.equal(res.status, 401);
	});
});
