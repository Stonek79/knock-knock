/**
 * Auth collection options are part of the committed PocketBase schema.
 * Nemo intentionally does not send email alerts on new-device login.
 *
 * `users.listRule`/`viewRule` должны быть owner-only, а не
 * auth-only, чтобы обычный пользователь видел напрямую только собственную
 * запись, а чтение чужих профилей шло через серверные DTO-эндпоинты.
 * Фактическую активность правил в Dev подтверждает владелец отдельным
 * runtime-прогоном после изменения через Admin UI.
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const schema = require(path.resolve(__dirname, "../../pb_schema.json"));

const OWNER_ONLY_RULE = '@request.auth.id != "" && id = @request.auth.id';

describe("PocketBase users auth options", () => {
	it("disables new-device login email alerts", () => {
		const users = schema.find((collection) => collection.name === "users");

		assert.ok(users, "users auth collection must exist in the schema");
		assert.deepStrictEqual(users.authAlert, { enabled: false });
	});

	it("users.listRule and users.viewRule are owner-only, not auth-only", () => {
		const users = schema.find((collection) => collection.name === "users");

		assert.ok(users, "users auth collection must exist in the schema");
		assert.equal(
			users.listRule,
			OWNER_ONLY_RULE,
			"users.listRule must permit only the owner record",
		);
		assert.equal(
			users.viewRule,
			OWNER_ONLY_RULE,
			"users.viewRule must permit only the owner record",
		);
	});
});
