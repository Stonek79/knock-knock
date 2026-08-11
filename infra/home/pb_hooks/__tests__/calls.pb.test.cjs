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

let httpStub, appStub, osStub, jsonCalls, httpSendCalls;

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
		findRecordById: () => null,
		findCollectionByNameOrId: () => ({}),
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
		const handler = handlers["POST /api/calls/token"];
		const res = handler(makeE({ room_id: "room1", is_join: true }));

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
		httpStub.send = () => ({
			statusCode: 500,
			raw: "INTERNAL http://secret.example token=abc123",
			json: {},
		});
		const handler = handlers["POST /api/calls/token"];
		const res = handler(makeE({ room_id: "room1", is_join: true }));

		assert.strictEqual(res.status, 500);
		assert.ok(!res.payload.error.includes("http"));
		assert.ok(!res.payload.error.includes("INTERNAL"));
		assert.ok(!res.payload.error.includes("abc123"));
		assert.ok(!res.payload.error.includes("500"));
		assert.strictEqual(res.payload.error, "Не удалось получить токен звонка");
	});

	it("fails closed when PUSH_GATEWAY_SECRET is missing", () => {
		osStub.getenv = () => "";
		const handler = handlers["POST /api/calls/token"];
		const res = handler(makeE({ room_id: "room1", is_join: true }));

		assert.strictEqual(httpSendCalls.length, 0);
		assert.strictEqual(res.status, 500);
		assert.strictEqual(
			res.payload.error,
			"Push gateway secret is not configured",
		);
	});
});