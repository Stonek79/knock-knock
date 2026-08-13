/**
 * Auth collection options are part of the committed PocketBase schema.
 * Nemo intentionally does not send email alerts on new-device login.
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const schema = require(path.resolve(__dirname, "../../pb_schema.json"));

describe("PocketBase users auth options", () => {
	it("disables new-device login email alerts", () => {
		const users = schema.find((collection) => collection.name === "users");

		assert.ok(users, "users auth collection must exist in the schema");
		assert.deepStrictEqual(users.authAlert, { enabled: false });
	});
});
