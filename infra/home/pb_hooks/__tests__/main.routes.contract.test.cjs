/**
 * Route contract characterization after decomposition (U4).
 *
 * - Requires each new main.0X-*.pb.js with stubbed routerAdd/`$apis` and
 *   asserts the full expected route set is registered exactly once, each with
 *   $apis.requireAuth() middleware.
 * - Asserts the migrated monolith main.pb.js has been removed from the tree.
 * - For the user-capability module verifies DTO allowlist usage (no
 *   publicExport() call) and parameter-bound filters.
 * - Requiring the modules exercises parsing, so syntax errors fail the test.
 * No DB/API/network is used.
 */
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const HOOKS_DIR = path.resolve(__dirname, "..");

const requireAuthMarker = Symbol("REQUIRE_AUTH");
let routes = [];

globalThis.$apis = { requireAuth: () => requireAuthMarker };
globalThis.routerAdd = (method, route, handler, ...middleware) => {
	if (typeof handler !== "function") {
		throw new TypeError("route handler must be a function");
	}
	routes.push({
		method,
		route,
		handler,
		requireAuth: middleware.includes(requireAuthMarker),
	});
};

function loadRoutes(file) {
	routes = [];
	globalThis.__hooks = HOOKS_DIR;
	const resolved = require.resolve(path.join(HOOKS_DIR, file));
	delete require.cache[resolved];
	require(resolved);
	return routes;
}

describe("route decomposition contract", () => {
	it("main.05: admin broadcast routes зарегистрированы ровно один раз", () => {
		const got = loadRoutes("main.05-admin-broadcast.pb.js");
		const expected = [
			["POST", "/api/custom/broadcast"],
			["GET", "/api/custom/broadcast/history"],
			["DELETE", "/api/custom/broadcast/:id"],
			["POST", "/api/custom/admin/migrate-system-rooms"],
		];
		assert.deepEqual(
			got.map((r) => [r.method, r.route]),
			expected,
		);
		assert.ok(got.every((r) => r.requireAuth));
	});

	it("main.06: user capability routes зарегистрированы ровно один раз", () => {
		const got = loadRoutes("main.06-user-capabilities.pb.js");
		const expected = [
			["GET", "/api/custom/users/contacts"],
			["GET", "/api/custom/users/search"],
			["POST", "/api/custom/users/keys"],
		];
		assert.deepEqual(
			got.map((r) => [r.method, r.route]),
			expected,
		);
		assert.ok(got.every((r) => r.requireAuth));
	});

	it("main.07: invite generation зарегистрирован ровно один раз", () => {
		const got = loadRoutes("main.07-invites.pb.js");
		assert.deepEqual(
			got.map((r) => [r.method, r.route]),
			[
				["POST", "/api/custom/invites/generate"],
				["POST", "/api/custom/invites/validate"],
			],
		);
		assert.ok(got.every((r) => r.requireAuth));
	});

	it("main.08: room-read зарегистрирован ровно один раз", () => {
		const got = loadRoutes("main.08-room-read.pb.js");
		assert.deepEqual(
			got.map((r) => [r.method, r.route]),
			[["POST", "/api/custom/rooms/:roomId/read"]],
		);
		assert.ok(got.every((r) => r.requireAuth));
	});

	it("все invite/capability routes зарегистрированы ровно один раз, без дубликатов и с requireAuth", () => {
		const allRoutes = [
			...loadRoutes("main.05-admin-broadcast.pb.js"),
			...loadRoutes("main.06-user-capabilities.pb.js"),
			...loadRoutes("main.07-invites.pb.js"),
			...loadRoutes("main.08-room-read.pb.js"),
		];
		assert.equal(allRoutes.length, 10);
		assert.equal(new Set(allRoutes.map((r) => r.route)).size, 10);
		assert.ok(allRoutes.every((r) => r.requireAuth));
	});

	it("main.pb.js удалён после переноса всех routes", () => {
		assert.ok(
			!fs.existsSync(path.join(HOOKS_DIR, "main.pb.js")),
			"main.pb.js должен быть удалён, а не содержать пустую оболочку",
		);
	});

	it("user routes не используют publicExport() и сохраняют DTO allowlist", () => {
		const src = fs.readFileSync(
			path.join(HOOKS_DIR, "main.06-user-capabilities.pb.js"),
			"utf8",
		);
		assert.ok(!src.includes(".publicExport("), "нет вызова publicExport()");
		for (const dto of [
			"toContactProfileDto",
			"toPublicProfileSearchDto",
			"toAdminUserDto",
			"toPublicKeyDto",
		]) {
			assert.ok(src.includes(dto), `использует ${dto}`);
		}
	});

	it("user routes используют parameter binding (buildOrBoundFilter)", () => {
		const src = fs.readFileSync(
			path.join(HOOKS_DIR, "main.06-user-capabilities.pb.js"),
			"utf8",
		);
		assert.ok(src.includes("buildOrBoundFilter"));
		assert.ok(src.includes("sanitizeAndCapUserIds"));
		assert.ok(src.includes("hasTooManyUserIds"));
		assert.ok(src.includes("{:"), "присутствуют parameter-bound фильтры");
	});

	it("admin broadcast не пишет тело запроса в лог", () => {
		const src = fs.readFileSync(
			path.join(HOOKS_DIR, "main.05-admin-broadcast.pb.js"),
			"utf8",
		);
		assert.doesNotMatch(src, /JSON\.stringify\(info\?\.body\)/);
		assert.doesNotMatch(src, /console\.log\([^\n]*(rawBody|bodyData)/);
	});

	it("invite routes use token only and do not reference legacy fields", () => {
		const src = fs.readFileSync(
			path.join(HOOKS_DIR, "main.07-invites.pb.js"),
			"utf8",
		);
		assert.match(src, /token = \{:\s*inviteToken\}/);
		assert.doesNotMatch(src, /set\("code"/);
		assert.doesNotMatch(src, /set\("status"/);
		assert.doesNotMatch(src, /code\s*=/);
	});

	it("room-read не затеняет route event в проверке membership", () => {
		const src = fs.readFileSync(
			path.join(HOOKS_DIR, "main.08-room-read.pb.js"),
			"utf8",
		);
		assert.match(src, /catch \{[\s\S]*return e\.json\(500/);
		assert.match(src, /memberRecords\.length === 0[\s\S]*return e\.json\(403/);
	});

	it("room-read различает отсутствие membership и ошибку БД", () => {
		const [{ handler }] = loadRoutes("main.08-room-read.pb.js");
		const event = {
			auth: { id: "user123" },
			request: { pathValue: () => "room123" },
			json: (status, body) => ({ status, body }),
		};

		try {
			globalThis.$app = {
				findRecordsByFilter: () => [],
			};
			assert.equal(handler(event).status, 403);

			globalThis.$app.findRecordsByFilter = () => {
				throw new Error("database unavailable");
			};
			assert.equal(handler(event).status, 500);
		} finally {
			delete globalThis.$app;
		}
	});
});
