/**
 * Проверяют явные allowlist DTO для public search, contacts и public keys,
 * отсутствие sensitive-полей, fail-closed поведение для private/unknown и
 * сохранение параметризованных filter-хелперов для parameter binding.
 * Не подключаются к какой-либо базе данных.
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const dto = require("../users_dto.js");

/** record-like view: `.id` + `.getString(field)` как у PocketBase Record. */
function view(data = {}) {
	const record = { id: data.id || "u-1", ...data };
	record.getString = (field) =>
		record[field] === undefined ? "" : record[field];
	return record;
}

describe("users_dto allowlist mappers", () => {
	it("public search DTO содержит ровно allowlist-поля без sensitive-полей", () => {
		const out = dto.toPublicProfileSearchDto(
			view({
				id: "u1",
				profile_type: "public",
				username: "alice",
				display_name: "Alice",
				avatar: "a.jpg",
				email: "secret@example.test",
				settings: {},
				invite_code: "kk-test",
				tokenKey: "t",
				encrypted_profile: {},
				key_vault: "vault",
				public_key_x25519: "x",
				public_key_signing: "y",
				status: "online",
				last_seen: "now",
			}),
		);
		assert.deepEqual(out, {
			id: "u1",
			profile_type: "public",
			username: "alice",
			display_name: "Alice",
			avatar: "a.jpg",
		});
	});

	it("private contact DTO fail-closed: только id+profile_type", () => {
		const out = dto.toContactProfileDto(
			view({
				id: "u2",
				profile_type: "private",
				username: "bob",
				display_name: "Bob",
				avatar: "b.jpg",
				status: "online",
				last_seen: "now",
			}),
		);
		assert.deepEqual(out, { id: "u2", profile_type: "private" });
	});

	it("unknown contact DTO также fail-closed (profile_type по умолчанию private)", () => {
		const out = dto.toContactProfileDto(
			view({ id: "u2b", username: "carlos", display_name: "Carlos" }),
		);
		assert.deepEqual(out, { id: "u2b", profile_type: "private" });
	});

	it("public contact DTO отдаёт name/avatar/status/last_seen, но не sensitive", () => {
		const out = dto.toContactProfileDto(
			view({
				id: "u3",
				profile_type: "public",
				username: "carol",
				display_name: "Carol",
				avatar: "c.jpg",
				status: "online",
				last_seen: "now",
				email: "e@example.test",
				key_vault: "vault",
			}),
		);
		assert.deepEqual(out, {
			id: "u3",
			profile_type: "public",
			username: "carol",
			display_name: "Carol",
			avatar: "c.jpg",
			status: "online",
			last_seen: "now",
		});
	});

	it("key DTO возвращает ровно два ключа и null при пустом/невалидном ключе", () => {
		assert.deepEqual(
			dto.toPublicKeyDto(
				view({ id: "u4", public_key_x25519: "x", public_key_signing: "y" }),
			),
			{ id: "u4", public_key_x25519: "x", public_key_signing: "y" },
		);
		assert.equal(
			dto.toPublicKeyDto(
				view({ id: "u4", public_key_x25519: "", public_key_signing: "y" }),
			),
			null,
		);
		assert.equal(
			dto.toPublicKeyDto(
				view({ id: "u4", public_key_x25519: "x", public_key_signing: "" }),
			),
			null,
		);
	});

	it("admin DTO сохраняет только согласованный banned_until", () => {
		assert.deepEqual(
			dto.toAdminUserDto(
				view({
					id: "u5",
					profile_type: "private",
					username: "admin-view",
					display_name: "Admin View",
					created: "2026-01-01 00:00:00",
					banned_until: "2026-01-02 00:00:00",
					email: "secret@example.test",
					settings: { secret: true },
				}),
			),
			{
				id: "u5",
				profile_type: "private",
				username: "admin-view",
				display_name: "Admin View",
				created: "2026-01-01 00:00:00",
				banned_until: "2026-01-02 00:00:00",
			},
		);
	});

	it("sanitizeAndCapUserIds дедуплицирует, режет не-строки и ограничивает", () => {
		assert.deepEqual(
			dto.sanitizeAndCapUserIds([
				1,
				"aaaaaaaaaaaaaaa",
				"aaaaaaaaaaaaaaa",
				"",
				"bbbbbbbbbbbbbbb",
				null,
				"ccccccccccccccc",
				"ddddddddddddddd",
			]),
			[
				"aaaaaaaaaaaaaaa",
				"bbbbbbbbbbbbbbb",
				"ccccccccccccccc",
				"ddddddddddddddd",
			],
		);
		const many = Array.from(
			{ length: 200 },
			(_, i) => `u${String(i).padStart(14, "0")}`,
		);
		assert.equal(
			dto.sanitizeAndCapUserIds(many).length,
			dto.MAX_USERS_PER_KEYS_REQUEST,
		);
		assert.equal(dto.sanitizeAndCapUserIds(undefined).length, 0);
		assert.equal(dto.sanitizeAndCapUserIds(null).length, 0);
		assert.equal(dto.hasTooManyUserIds(many), true);
		assert.equal(
			dto.hasTooManyUserIds(["aaaaaaaaaaaaaaa", "aaaaaaaaaaaaaaa"]),
			false,
		);
	});

	it("buildOrBoundFilter строит OR-filter с parameter binding, не интерполируя значения", () => {
		const { filter, params } = dto.buildOrBoundFilter(
			"room",
			["r1", "r2"],
			"room",
		);
		assert.equal(filter, "room = {:room0} || room = {:room1}");
		assert.deepEqual(params, { room0: "r1", room1: "r2" });
	});
});
