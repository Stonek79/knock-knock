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

/**
 * P0.3b — закрытие серверной авторизации для presence_status, message_reactions,
 * media и call_logs. Правила фиксируют желаемое fail-closed состояние; операции,
 * которые нельзя выразить декларативно (presence heartbeat/typing, комнатное
 * присутствие, MIME/size media, call status transitions), выносится в
 * server-owned hook-маршруты, а не расширяют эти правила.
 */
describe("P0.3b authorization boundaries (schema snapshot)", () => {
	const find = (name) => schema.find((c) => c.name === name);
	const NULL_RULE = null;
	const MEDIA_MEMBER_RULE =
		'@request.auth.id != "" && (created_by = @request.auth.id || room.room_members_via_room.user ?= @request.auth.id)';
	const MEDIA_CREATE_RULE =
		'@request.auth.id != "" && created_by = @request.auth.id && room.room_members_via_room.user ?= @request.auth.id';
	const REACTION_CREATE_RULE =
		'@request.auth.id != "" && user = @request.auth.id && message.room.room_members_via_room.user ?= @request.auth.id';
	const REACTION_DELETE_RULE = "@request.auth.id = user";

	it("presence_status has no direct client access (routes only)", () => {
		const col = find("presence_status");
		assert.ok(col, "presence_status must exist");
		for (const rule of [
			col.listRule,
			col.viewRule,
			col.createRule,
			col.updateRule,
			col.deleteRule,
		]) {
			assert.equal(
				rule,
				NULL_RULE,
				"presence_status direct collection access must be closed",
			);
		}
	});

	it("message_reactions cannot be listed/viewed/updated by clients", () => {
		const col = find("message_reactions");
		assert.ok(col, "message_reactions must exist");
		assert.equal(col.listRule, NULL_RULE, "no global reaction list");
		assert.equal(col.viewRule, NULL_RULE, "no global reaction view");
		assert.equal(col.updateRule, NULL_RULE, "reactions are immutable");
	});

	it("message_reactions create/delete require self + room membership", () => {
		const col = find("message_reactions");
		assert.ok(col, "message_reactions must exist");
		assert.equal(
			col.createRule,
			REACTION_CREATE_RULE,
			"create only by a member of the message room, as self",
		);
		assert.equal(
			col.deleteRule,
			REACTION_DELETE_RULE,
			"delete only by owner",
		);
	});

	it("media read is membership/owner-scoped and create requires membership", () => {
		const col = find("media");
		assert.ok(col, "media must exist");
		assert.equal(col.listRule, MEDIA_MEMBER_RULE, "media list is scoped");
		assert.equal(col.viewRule, MEDIA_MEMBER_RULE, "media view is scoped");
		assert.equal(
			col.createRule,
			MEDIA_CREATE_RULE,
			"chat media create requires room membership",
		);
	});

	it("media update/delete stay owner-only", () => {
		const col = find("media");
		assert.ok(col, "media must exist");
		assert.equal(col.updateRule, "@request.auth.id = created_by");
		assert.equal(col.deleteRule, "@request.auth.id = created_by");
	});

	it("media files are protected and capped before persistence", () => {
		const col = find("media");
		assert.ok(col, "media must exist");
		const file = col.fields.find((field) => field.name === "file");
		assert.ok(file, "media.file must exist");
		assert.equal(file.protected, true);
		assert.equal(file.maxSize, 50 * 1024 * 1024);
	});

	it("call_logs direct update/delete stay closed (server route only)", () => {
		const col = find("call_logs");
		assert.ok(col, "call_logs must exist");
		assert.equal(col.updateRule, NULL_RULE, "no direct call log update");
		assert.equal(col.deleteRule, NULL_RULE, "no direct call log delete");
	});
});
