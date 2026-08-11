/**
 * Unit tests for task_helpers.js (PocketBase hooks).
 * Stubs globals $http, $app, $os, __hooks.
 * Verifies server-to-server secret header, fail-closed, expired_ids cleanup.
 */
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const path = require("node:path");

const HOOKS_DIR = path.resolve(__dirname, "..");
let httpStub, appStub, osStub;

beforeEach(() => {
	globalThis.__hooks = HOOKS_DIR;

	httpStub = { send: null };
	globalThis.$http = httpStub;

	appStub = {
		findRecordsByFilter: () => [],
		findRecordById: () => null,
		findCollectionByNameOrId: () => ({}),
		delete: () => {},
		store: () => ({ has: () => false, set: () => {}, remove: () => {} }),
	};
	globalThis.$app = appStub;

	osStub = { getenv: () => "" };
	globalThis.$os = osStub;

	// Silence console during tests
	globalThis.console = { log: () => {}, error: () => {}, warn: () => {} };
});

afterEach(() => {
	delete globalThis.__hooks;
	delete globalThis.$http;
	delete globalThis.$app;
	delete globalThis.$os;
});

const helpers = require("../task_helpers.js");

describe("handlePushTask", () => {
	it("sends Authorization: Bearer header when secret is configured", () => {
		osStub.getenv = (k) =>
			k === "PUSH_GATEWAY_SECRET"
				? "my-secret"
				: k === "PB_PUSH_GATEWAY_URL"
					? "http://gw:4000"
					: "";

		let sentHeaders = {};
		httpStub.send = (opts) => {
			sentHeaders = opts.headers || {};
			return {
				statusCode: 200,
				json: () => ({ results: [], expired_ids: [] }),
			};
		};

		helpers.handlePushTask({
			subscriptions: [
				{ id: "s1", endpoint: "https://x/1", keys: { p256dh: "a", auth: "b" } },
			],
			data: { type: "test" },
		});

		assert.strictEqual(sentHeaders.Authorization, "Bearer my-secret");
	});

	it("throws fail-closed when PUSH_GATEWAY_SECRET is missing", () => {
		osStub.getenv = () => "";
		assert.throws(
			() => helpers.handlePushTask({ subscriptions: [{}], data: {} }),
			/PUSH_GATEWAY_SECRET/,
		);
	});

	it("deletes expired subscriptions by id", () => {
		osStub.getenv = (k) =>
			k === "PUSH_GATEWAY_SECRET" ? "s" : "http://gw:4000";

		const deletedIds = [];
		appStub.findRecordById = (_table, id) => {
			return { id, get: () => id }; // mock Record
		};
		appStub.delete = (rec) => {
			deletedIds.push(rec.id);
		};

		httpStub.send = () => ({
			statusCode: 200,
			json: () => ({ results: [], expired_ids: ["sub-a", "sub-b"] }),
		});

		helpers.handlePushTask({
			subscriptions: [
				{ id: "s1", endpoint: "https://x/1", keys: { p256dh: "a", auth: "b" } },
			],
			data: {},
		});

		assert.deepStrictEqual(deletedIds, ["sub-a", "sub-b"]);
	});

	it("throws on non-2xx response", () => {
		osStub.getenv = (k) =>
			k === "PUSH_GATEWAY_SECRET" ? "s" : "http://gw:4000";

		httpStub.send = () => ({ statusCode: 500, json: () => ({}), raw: "" });

		assert.throws(
			() =>
				helpers.handlePushTask({
					subscriptions: [
						{ id: "s1", endpoint: "x", keys: { p256dh: "a", auth: "b" } },
					],
					data: {},
				}),
			/Push Gateway error/,
		);
	});

	it("does not leak raw response or url in error message", () => {
		osStub.getenv = (k) =>
			k === "PUSH_GATEWAY_SECRET" ? "s" : "http://gw:4000";

		httpStub.send = () => ({
			statusCode: 500,
			json: () => ({}),
			raw: "INTERNAL ERROR http://secret.example/leak token=abc",
		});

		assert.throws(
			() =>
				helpers.handlePushTask({
					subscriptions: [
						{ id: "s1", endpoint: "x", keys: { p256dh: "a", auth: "b" } },
					],
					data: {},
				}),
			(err) => {
				assert.ok(!err.message.includes("http://"));
				assert.ok(!err.message.includes("INTERNAL ERROR"));
				assert.ok(!err.message.includes("token=abc"));
				return true;
			},
		);
	});

	it("throws generic error on network failure without leaking url", () => {
		osStub.getenv = (k) =>
			k === "PUSH_GATEWAY_SECRET" ? "s" : "http://gw:4000";

		httpStub.send = () => {
			throw new Error(
				"dial tcp http://whoami-push:4000: connection refused",
			);
		};

		assert.throws(
			() => helpers.handlePushTask({ subscriptions: [{}], data: {} }),
			(err) => {
				assert.strictEqual(err.message, "Push gateway network error");
				return true;
			},
		);
	});
});
