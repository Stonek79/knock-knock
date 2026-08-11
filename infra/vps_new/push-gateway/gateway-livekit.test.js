import assert from "node:assert";
import http from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";

process.env.PUSH_GATEWAY_SECRET = "test-secret-9a7b";
process.env.LIVEKIT_API_KEY = "test-lk-key";
process.env.LIVEKIT_API_SECRET = "test-lk-secret";

const { createApp } = await import("./index.js");
const TEST_SECRET = "test-secret-9a7b";

function startApp(app) {
	return new Promise((r, j) => {
		const s = app.listen(0, "127.0.0.1", () => r(s));
		s.on("error", j);
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
						resolve({ status: res.statusCode, headers: res.headers, body: d });
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

describe("POST /api/livekit-token", () => {
	let app, server;
	beforeEach(async () => {
		app = createApp({ livekitTokenPerMin: 10 });
		server = await startApp(app);
	});
	afterEach(() => server.close());

	const body = { roomName: "room-1", participantIdentity: "anon_abc" };

	it("rejects without secret 401", async () => {
		const r = await req(server, "/api/livekit-token", { body });
		assert.strictEqual(r.status, 401);
	});

	it("rejects wrong secret 401", async () => {
		const r = await req(server, "/api/livekit-token", {
			headers: { Authorization: "Bearer bad" },
			body,
		});
		assert.strictEqual(r.status, 401);
	});

	it("returns JWT 200", async () => {
		const r = await req(server, "/api/livekit-token", {
			headers: auth(),
			body,
		});
		assert.strictEqual(r.status, 200);
		assert.strictEqual(r.body.token.split(".").length, 3);
	});

	it("requires roomName 400", async () => {
		const r = await req(server, "/api/livekit-token", {
			headers: auth(),
			body: { roomName: "r" },
		});
		assert.strictEqual(r.status, 400);
	});

	it("rejects long values 400", async () => {
		const r = await req(server, "/api/livekit-token", {
			headers: auth(),
			body: { roomName: "x".repeat(129), participantIdentity: "a" },
		});
		assert.strictEqual(r.status, 400);
	});

	it("fail-closed no secret 503", async () => {
		delete process.env.PUSH_GATEWAY_SECRET;
		const a = createApp();
		const s = await startApp(a);
		const r = await req(s, "/api/livekit-token", { body });
		s.close();
		process.env.PUSH_GATEWAY_SECRET = TEST_SECRET;
		assert.strictEqual(r.status, 503);
	});
});

describe("healthz", () => {
	it("returns 200 without auth", async () => {
		const app = createApp();
		const srv = await startApp(app);
		const r = await req(srv, "/healthz", { method: "GET" });
		srv.close();
		assert.strictEqual(r.status, 200);
	});
});

describe("CORS", () => {
	it("no access-control-allow-origin", async () => {
		const app = createApp();
		const srv = await startApp(app);
		const r = await req(srv, "/healthz", { method: "GET" });
		srv.close();
		assert.strictEqual(r.headers["access-control-allow-origin"], undefined);
	});
});

describe("Rate limit", () => {
	it("returns 429 after exceeding limit by authorized requests", async () => {
		const app = createApp({ livekitTokenPerMin: 2 });
		const srv = await startApp(app);
		const body = { roomName: "r", participantIdentity: "p" };
		const h = auth();

		const r1 = await req(srv, "/api/livekit-token", { headers: h, body });
		const r2 = await req(srv, "/api/livekit-token", { headers: h, body });
		const r3 = await req(srv, "/api/livekit-token", { headers: h, body });
		srv.close();

		assert.strictEqual(r1.status, 200);
		assert.strictEqual(r2.status, 200);
		assert.strictEqual(r3.status, 429);
	});

	it("does not consume budget for unauthorized requests", async () => {
		const app = createApp({ livekitTokenPerMin: 1 });
		const srv = await startApp(app);
		const body = { roomName: "r", participantIdentity: "p" };
		const bad = { Authorization: "Bearer wrong" };

		const u1 = await req(srv, "/api/livekit-token", { headers: bad, body });
		const u2 = await req(srv, "/api/livekit-token", { headers: bad, body });
		const ok1 = await req(srv, "/api/livekit-token", {
			headers: auth(),
			body,
		});
		const limited = await req(srv, "/api/livekit-token", {
			headers: auth(),
			body,
		});
		srv.close();

		assert.strictEqual(u1.status, 401);
		assert.strictEqual(u2.status, 401);
		assert.strictEqual(ok1.status, 200);
		assert.strictEqual(limited.status, 429);
	});
});
