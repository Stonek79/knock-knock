/**
 * Unit tests for calls.pb.js (/api/calls/token hook).
 * Captures routerAdd, stubs $http/$app/$os/$security.
 * Verifies exact s2s Authorization header, PB-side membership gate,
 * generic client errors without url/raw, fail-closed without secret.
 */
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const path = require("node:path");

const HOOKS_DIR = path.resolve(__dirname, "..");

// Handlers регистрируются при require (routerAdd), поэтому перехватываем один раз.
const handlers = {};
globalThis.__hooks = HOOKS_DIR;
globalThis.routerAdd = (method, route, handler) => {
	handlers[`${method} ${route}`] = handler;
};
require("../calls.pb.js");

let httpStub, appStub, osStub, jsonCalls, httpSendCalls, callRecord;

beforeEach(() => {
	httpSendCalls = [];
	httpStub = {
		send: (opts) => {
			httpSendCalls.push(opts);
			return { statusCode: 200, json: { token: "tok" } };
		},
	};
	globalThis.$http = httpStub;

	appStub = {
		findRecordsByFilter: () => [{ id: "m1" }],
		findRecordById: () => callRecord,
		findCollectionByNameOrId: () => ({}),
		save: () => {},
		store: () => ({ has: () => false, set: () => {}, remove: () => {} }),
	};
	globalThis.$app = appStub;

	osStub = {
		getenv: (k) =>
			k === "PUSH_GATEWAY_SECRET"
				? "exact-secret-123"
				: k === "PB_PUSH_GATEWAY_URL"
					? "http://gw:4000/"
					: "",
	};
	globalThis.$os = osStub;

	globalThis.$security = { md5: () => "md5hash" };
	callRecord = null;

	jsonCalls = [];
	globalThis.console = { log: () => {}, error: () => {}, warn: () => {} };
});

afterEach(() => {
	delete globalThis.$http;
	delete globalThis.$app;
	delete globalThis.$os;
	delete globalThis.$security;
});

function makeE(body) {
	return {
		auth: { id: "user1" },
		requestInfo: () => ({ body }),
		json: (status, payload) => {
			jsonCalls.push({ status, payload });
			return { status, payload };
		},
	};
}

describe("calls.pb.js → POST /api/calls/token", () => {
	it("sends exact Authorization header to gateway", () => {
		callRecord = {
			getString: (field) =>
				field === "room"
					? "room1"
					: field === "status"
						? "ringing"
						: field === "initiator"
							? "user2"
							: "",
			set: () => {},
		};
		const handler = handlers["POST /api/calls/token"];
		const res = handler(
			makeE({ room_id: "room1", is_join: true, call_log_id: "call1" }),
		);

		assert.strictEqual(res.status, 200);
		assert.strictEqual(httpSendCalls.length, 1);
		assert.strictEqual(
			httpSendCalls[0].headers.Authorization,
			"Bearer exact-secret-123",
		);
		assert.strictEqual(
			httpSendCalls[0].url,
			"http://gw:4000/api/livekit-token",
		);
	});

	it("denies non-member without calling gateway", () => {
		appStub.findRecordsByFilter = () => [];
		const handler = handlers["POST /api/calls/token"];
		const res = handler(makeE({ room_id: "room1", is_join: true }));

		assert.strictEqual(res.status, 403);
		assert.strictEqual(res.payload.code, "ROOM_ACCESS_DENIED");
		assert.strictEqual(httpSendCalls.length, 0);
	});

	it("returns generic error without url/raw when gateway fails", () => {
		callRecord = {
			getString: (field) =>
				field === "room"
					? "room1"
					: field === "status"
						? "ongoing"
						: field === "initiator"
							? "user2"
							: "",
			set: () => {},
		};
		httpStub.send = () => ({
			statusCode: 500,
			raw: "INTERNAL http://secret.example token=abc123",
			json: {},
		});
		const handler = handlers["POST /api/calls/token"];
		const res = handler(
			makeE({ room_id: "room1", is_join: true, call_log_id: "call1" }),
		);

		assert.strictEqual(res.status, 500);
		assert.ok(!res.payload.error.includes("http"));
		assert.ok(!res.payload.error.includes("INTERNAL"));
		assert.ok(!res.payload.error.includes("abc123"));
		assert.ok(!res.payload.error.includes("500"));
		assert.strictEqual(res.payload.error, "Не удалось получить токен звонка");
	});

	it("fails closed when PUSH_GATEWAY_SECRET is missing", () => {
		callRecord = {
			getString: (field) =>
				field === "room"
					? "room1"
					: field === "status"
						? "ongoing"
						: field === "initiator"
							? "user2"
							: "",
			set: () => {},
		};
		osStub.getenv = () => "";
		const handler = handlers["POST /api/calls/token"];
		const res = handler(
			makeE({ room_id: "room1", is_join: true, call_log_id: "call1" }),
		);

		assert.strictEqual(httpSendCalls.length, 0);
		assert.strictEqual(res.status, 500);
		assert.strictEqual(
			res.payload.error,
			"Push gateway secret is not configured",
		);
	});

	it("rejects a join token paired with a call log from another room", () => {
		callRecord = {
			getString: (field) =>
				field === "room" ? "room2" : field === "status" ? "ringing" : "",
		};
		const handler = handlers["POST /api/calls/token"];
		const res = handler(
			makeE({ room_id: "room1", is_join: true, call_log_id: "call2" }),
		);

		assert.strictEqual(res.status, 403);
		assert.strictEqual(res.payload.code, "CALL_ACCESS_DENIED");
	});

	it("requires a call log id when joining", () => {
		const handler = handlers["POST /api/calls/token"];
		const res = handler(makeE({ room_id: "room1", is_join: true }));

		assert.strictEqual(res.status, 400);
		assert.strictEqual(res.payload.code, "CALL_LOG_ID_REQUIRED");
		assert.strictEqual(httpSendCalls.length, 0);
	});

	it("rejects a join token for a terminal call log", () => {
		callRecord = {
			getString: (field) =>
				field === "room"
					? "room1"
					: field === "status"
						? "ended"
						: field === "initiator"
							? "user2"
							: "",
		};
		const handler = handlers["POST /api/calls/token"];
		const res = handler(
			makeE({ room_id: "room1", is_join: true, call_log_id: "call1" }),
		);

		assert.strictEqual(res.status, 409);
		assert.strictEqual(res.payload.code, "INVALID_TRANSITION");
	});

	it("fails closed when accepting the call cannot persist its status", () => {
		callRecord = {
			getString: (field) =>
				field === "room"
					? "room1"
					: field === "status"
						? "ringing"
						: field === "initiator"
							? "user2"
							: "",
			set: () => {},
		};
		appStub.save = () => {
			throw new Error("save failed");
		};
		const handler = handlers["POST /api/calls/token"];
		const res = handler(
			makeE({ room_id: "room1", is_join: true, call_log_id: "call1" }),
		);

		assert.strictEqual(res.status, 500);
		assert.strictEqual(res.payload.code, "INTERNAL_ERROR");
	});

	it("rejects the initiator from joining its own ringing call", () => {
		callRecord = {
			getString: (field) =>
				field === "room"
					? "room1"
					: field === "status"
						? "ringing"
						: field === "initiator"
							? "user1"
							: "",
		};
		const handler = handlers["POST /api/calls/token"];
		const res = handler(
			makeE({ room_id: "room1", is_join: true, call_log_id: "call1" }),
		);

		assert.strictEqual(res.status, 403);
		assert.strictEqual(res.payload.code, "CALL_ACTOR_FORBIDDEN");
		assert.strictEqual(httpSendCalls.length, 0);
	});
});
