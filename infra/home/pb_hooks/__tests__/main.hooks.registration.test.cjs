/**
 * Static characterization of hook-module boundaries after decomposition.
 *
 * - Loads each new main.0X-*.pb.js module with stubbed registration globals
 *   and asserts each expected hook/cron registration occurs exactly once with
 *   the correct target collection / cron name.
 * - Asserts the migrated monolith main.pb.js has been removed from the tree.
 * - Requires the new modules, so any syntax error in them fails this test.
 * No DB/API/network is used.
 */
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const HOOKS_DIR = path.resolve(__dirname, "..");

const NEW_MODULE_FILES = [
	"main.01-user-lifecycle.pb.js",
	"main.02-registration.pb.js",
	"main.03-message-delivery.pb.js",
	"main.04-scheduled-tasks.pb.js",
];

function loadNewModules() {
	const createSuccess = [];
	const deleteSuccess = [];
	const createRequest = [];
	const bootstrap = [];
	const cronNames = [];

	globalThis.__hooks = HOOKS_DIR;
	globalThis.onRecordAfterCreateSuccess = (callback, collection) => {
		if (typeof callback !== "function") {
			throw new TypeError("hook callback must be a function");
		}
		createSuccess.push(collection);
	};
	globalThis.onRecordAfterDeleteSuccess = (callback, collection) => {
		if (typeof callback !== "function") {
			throw new TypeError("hook callback must be a function");
		}
		deleteSuccess.push(collection);
	};
	globalThis.onRecordCreateRequest = (callback, collection) => {
		if (typeof callback !== "function") {
			throw new TypeError("hook callback must be a function");
		}
		createRequest.push(collection);
	};
	globalThis.onBootstrap = () => bootstrap.push(true);
	globalThis.cronAdd = (name, schedule, callback) => {
		if (typeof schedule !== "string" || schedule.length === 0) {
			throw new TypeError("cron schedule must be a non-empty string");
		}
		if (typeof callback !== "function") {
			throw new TypeError("cron callback must be a function");
		}
		cronNames.push(name);
	};

	try {
		for (const file of NEW_MODULE_FILES) {
			const resolved = require.resolve(path.join(HOOKS_DIR, file));
			delete require.cache[resolved];
			require(resolved);
		}
	} finally {
		delete globalThis.__hooks;
		delete globalThis.onRecordAfterCreateSuccess;
		delete globalThis.onRecordAfterDeleteSuccess;
		delete globalThis.onRecordCreateRequest;
		delete globalThis.onBootstrap;
		delete globalThis.cronAdd;
	}

	return { createSuccess, deleteSuccess, createRequest, bootstrap, cronNames };
}

describe("main hook decomposition (U3)", () => {
	it("загружает новые модули без синтаксических ошибок", () => {
		assert.doesNotThrow(() => loadNewModules());
	});

	it("main.01: user lifecycle зарегистрирован ровно один раз", () => {
		const { createSuccess, deleteSuccess } = loadNewModules();
		assert.deepEqual(
			createSuccess.filter((c) => c === "users"),
			["users"],
		);
		assert.deepEqual(deleteSuccess, ["users"]);
	});

	it("main.02: registration зарегистрирован ровно один раз", () => {
		const { createRequest } = loadNewModules();
		assert.deepEqual(createRequest, ["users"]);
	});

	it("main.03: message delivery зарегистрирован ровно один раз", () => {
		const { createSuccess } = loadNewModules();
		assert.deepEqual(
			createSuccess.filter((c) => c === "messages"),
			["messages"],
		);
	});

	it("main.04: bootstrap и оба cron зарегистрированы ровно один раз", () => {
		const { bootstrap, cronNames } = loadNewModules();
		assert.equal(bootstrap.length, 1);
		assert.deepEqual(
			cronNames.sort(),
			["cleanup_system_messages", "process_broadcasts"].sort(),
		);
	});

	it("не содержит дубликатов ожидаемых регистраций", () => {
		const { createSuccess, cronNames } = loadNewModules();
		for (const collection of createSuccess) {
			assert.equal(
				createSuccess.filter((c) => c === collection).length,
				1,
				`коллекция ${collection} не должна регистрироваться более одного раза`,
			);
		}
		assert.equal(new Set(cronNames).size, cronNames.length);
	});

	it("main.pb.js удалён после переноса всех регистраций", () => {
		assert.ok(
			!fs.existsSync(path.join(HOOKS_DIR, "main.pb.js")),
			"main.pb.js должен быть удалён, а не содержать пустую оболочку",
		);
	});
});
