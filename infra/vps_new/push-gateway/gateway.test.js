/**
 * Unit/integration tests for push-gateway — send-push + auth.
 * No real Web Push requests; webpush.sendNotification is stubbed.
 */

import assert from "node:assert";
import http from "node:http";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import webpush from "web-push";

const vapidKeys = await webpush.generateVAPIDKeys();
process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
process.env.PUSH_GATEWAY_SECRET = "test-secret-9a7b";

const { createApp } = await import("./index.js");
const TEST_SECRET = "test-secret-9a7b";

const realSend = webpush.sendNotification;
before(() => {
	webpush.sendNotification = async ({ endpoint }) => {
		if (endpoint?.includes("expired"))
			throw Object.assign(new Error("Gone"), { statusCode: 410 });
		return { statusCode: 201 };
	};
});
after(() => {
	webpush.sendNotification = realSend;
});

function startApp(app) {
	return new Promise((resolve, reject) => {
		const s = app.listen(0, "127.0.0.1", () => resolve(s));
		s.on("error", reject);
	});
}

function req(server, path, opts = {}) {
	const { method = "POST", headers = {}, body } = opts;
	return new Promise((resolve, reject) => {
		const h = { "Content-Type": "application/json", ...headers };
		const r = http.request(
			{
				hostname: "127.0.0.1",
				port: server.address().port,
				path,
				method,
				headers: h,
			},
			(res) => {
				let d = "";
				res.on("data", (c) => (d += c));
				res.on("end", () => {
					try {
						resolve({
							status: res.statusCode,
							headers: res.headers,
							body: JSON.parse(d),
						});
					} catch {
						resolve({ status: res.statusCode, body: d });
					}
				});
			},
		);
		r.on("error", reject);
		if (body !== undefined) r.write(JSON.stringify(body));
		r.end();
	});
}

function auth() {
	return { Authorization: `Bearer ${TEST_SECRET}` };
}
describe("POST /api/send-push", () => {
	let app, server;
	beforeEach(async () => {
		app = createApp({ sendPushPerMin: 30 });
		server = await startApp(app);
	});
	afterEach(() => server.close());

	const validSub = {
		subscriptions: [
			{
				id: "rec1",
				endpoint: "https://x.invalid/1",
				keys: { p256dh: "aA==", auth: "bB==" },
			},
		],
		payload: { data: { type: "call_incoming" } },
	};

	it("rejects without secret → 401", async () => {
		const r = await req(server, "/api/send-push", { body: validSub });
		assert.strictEqual(r.status, 401);
	});

	it("rejects wrong secret → 401", async () => {
		const r = await req(server, "/api/send-push", {
			headers: { Authorization: "Bearer wrong" },
			body: validSub,
		});
		assert.strictEqual(r.status, 401);
	});

	it("returns 200 with valid secret", async () => {
		const r = await req(server, "/api/send-push", {
			headers: auth(),
			body: validSub,
		});
		assert.strictEqual(r.status, 200);
		assert.ok(Array.isArray(r.body.results));
		assert.ok(Array.isArray(r.body.expired_ids));
		assert.strictEqual(r.body.results[0].success, true);
	});

	it("does not leak endpoint in body", async () => {
		const r = await req(server, "/api/send-push", {
			headers: auth(),
			body: validSub,
		});
		assert.ok(!JSON.stringify(r.body).includes("https://x.invalid"));
	});

	it("returns expired_ids for 410 subscriptions", async () => {
		const r = await req(server, "/api/send-push", {
			headers: auth(),
			body: {
				subscriptions: [
					{
						id: "exp1",
						endpoint: "https://expired.invalid/p",
						keys: { p256dh: "aA==", auth: "bB==" },
					},
				],
				payload: {},
			},
		});
		assert.strictEqual(r.status, 200);
		assert.strictEqual(r.body.expired_ids.length, 1);
		assert.strictEqual(r.body.expired_ids[0], "exp1");
	});

	it("normalizes legacy flat key format (old queued tasks)", async () => {
		const r = await req(server, "/api/send-push", {
			headers: auth(),
			body: {
				subscriptions: [
					{
						id: "flat1",
						endpoint: "https://x.invalid/flat",
						p256dh: "aA==",
						auth: "bB==",
					},
				],
				payload: { data: { type: "message" } },
			},
		});
		assert.strictEqual(r.status, 200);
		assert.strictEqual(r.body.results[0].success, true);
	});

	it("rejects missing subscriptions → 400", async () => {
		const r = await req(server, "/api/send-push", {
			headers: auth(),
			body: { payload: {} },
		});
		assert.strictEqual(r.status, 400);
	});

	it("rejects oversized body → 413", async () => {
		const big = Buffer.from(
			JSON.stringify({
				subscriptions: [validSub.subscriptions[0]],
				payload: "0".repeat(110 * 1024),
			}),
		);
		const res = await new Promise((resolve) => {
			const rq = http.request(
				{
					hostname: "127.0.0.1",
					port: server.address().port,
					path: "/api/send-push",
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Content-Length": big.length,
						Authorization: `Bearer ${TEST_SECRET}`,
					},
				},
				(resp) => {
					resolve({ status: resp.statusCode });
				},
			);
			rq.write(big);
			rq.end();
		});
		assert.strictEqual(res.status, 413);
	});

	it("returns 503 when secret not configured", async () => {
		delete process.env.PUSH_GATEWAY_SECRET;
		const a = createApp();
		const s = await startApp(a);
		const r = await req(s, "/api/send-push", { body: validSub });
		s.close();
		process.env.PUSH_GATEWAY_SECRET = TEST_SECRET;
		assert.strictEqual(r.status, 503);
	});
});
