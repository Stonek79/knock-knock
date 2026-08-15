/**
 * Unit tests for request_utils.parseJsonBody (PocketBase hooks).
 * Verifies empty, malformed and oversized request bodies without DB/network.
 * PocketBase JSVM exposes a global `toString` used for the raw-body fallback,
 * so the test stubs it (not available in Node by default as free identifier).
 */
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const HOOKS_DIR = path.resolve(__dirname, "..");

beforeEach(() => {
	globalThis.__hooks = HOOKS_DIR;
	globalThis.toString = (value) => (value == null ? "" : String(value));
	globalThis.console = { log: () => {}, error: () => {}, warn: () => {} };
});

afterEach(() => {
	delete globalThis.__hooks;
	delete globalThis.toString;
	delete globalThis.console;
});

const { parseJsonBody } = require("../request_utils.js");

function makeE(infoBody, rawBody) {
	return {
		requestInfo: () => ({ body: infoBody }),
		request: { body: rawBody },
	};
}

describe("request_utils.parseJsonBody", () => {
	it("возвращает {} для пустого body", () => {
		assert.deepEqual(parseJsonBody(makeE({}, null)), {});
	});

	it("возвращает объект из отказавшего raw fallback при повреждённом JSON", () => {
		// info.body отсутствует, raw тело не является валидным JSON
		assert.deepEqual(parseJsonBody(makeE(null, "{broken")), {});
	});

	it("возвращает {} при полностью отсутствующем теле", () => {
		assert.deepEqual(
			parseJsonBody({
				requestInfo: () => ({ body: null }),
				request: { body: "" },
			}),
			{},
		);
	});

	it("не падает на слишком большом валидном JSON-body и не обрезает его", () => {
		const text = "x".repeat(2 * 1024 * 1024); // ~2MB строка
		const body = JSON.stringify({ text });
		const out = parseJsonBody(makeE(null, body));
		assert.equal(out.text, text);
	});
});
