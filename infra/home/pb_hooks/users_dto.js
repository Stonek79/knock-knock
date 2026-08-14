/**
 * Pure allowlist DTO mappers for user-related custom routes.
 *
 * Mappеры не зависят от PocketBase: принимают record-like view, раскрывающую
 * `.id` и `.getString(field)`, и возвращают минимальный набор явно разрешённых
 * полей. Намеренно НЕ используют publicExport(): при расширении users-schema
 * будущие чувствительные поля не должны "просочиться" в ответ по умолчанию.
 */

const USER_PROFILE_TYPE_PUBLIC = "public";
const USER_PROFILE_TYPE_PRIVATE = "private";

const MAX_USERS_PER_KEYS_REQUEST = 50;
const USER_ID_PATTERN = /^[a-z0-9]{15}$/;
const USER_FIELDS = {
	PROFILE_TYPE: "profile_type",
	USERNAME: "username",
	DISPLAY_NAME: "display_name",
	AVATAR: "avatar",
	STATUS: "status",
	LAST_SEEN: "last_seen",
	CREATED: "created",
	BANNED_UNTIL: "banned_until",
	PUBLIC_KEY_X25519: "public_key_x25519",
	PUBLIC_KEY_SIGNING: "public_key_signing",
};

/** Безопасное чтение строкового поля с fallback. */
function readString(view, field, fallback = "") {
	const value =
		view && typeof view.getString === "function"
			? view.getString(field)
			: undefined;
	if (typeof value === "string" && value !== "") {
		return value;
	}
	return fallback;
}

function readNullableString(view, field) {
	const value = readString(view, field);
	return value || null;
}

function profileTypeOf(view) {
	return readString(view, USER_FIELDS.PROFILE_TYPE, USER_PROFILE_TYPE_PRIVATE);
}

/**
 * DTO для GET /api/custom/users/search (общедоступный поиск).
 * Allowlist: id, profile_type, username, display_name, avatar.
 * Здесь никогда нет email, settings, invite_code, tokenKey, encrypted_profile,
 * key_vault и ключевого material.
 */
function toPublicProfileSearchDto(view) {
	return {
		id: view.id,
		profile_type: profileTypeOf(view),
		username: readString(view, USER_FIELDS.USERNAME),
		display_name: readString(view, USER_FIELDS.DISPLAY_NAME),
		avatar: readString(view, USER_FIELDS.AVATAR),
	};
}

/**
 * Минимальный административный DTO (ветка суперпользователя при пустом поиске).
 * Только мало-чувствительные поля identity+created; никогда полный auth-record.
 */
function toAdminUserDto(view) {
	return {
		id: view.id,
		profile_type: profileTypeOf(view),
		username: readString(view, USER_FIELDS.USERNAME),
		display_name: readString(view, USER_FIELDS.DISPLAY_NAME),
		created: readString(view, USER_FIELDS.CREATED),
		banned_until: readNullableString(view, USER_FIELDS.BANNED_UNTIL),
	};
}

/**
 * Contacts DTO, отдельный и membership-scoped. Для private/unknown
 * профиля fail-closed: только { id, profile_type } — без name/username/avatar,
 * status/last_seen и без технических идентификаторов как UI fallback.
 */
function toContactProfileDto(view) {
	const base = {
		id: view.id,
		profile_type: profileTypeOf(view),
	};
	if (profileTypeOf(view) !== USER_PROFILE_TYPE_PUBLIC) {
		return base;
	}
	return {
		...base,
		username: readString(view, USER_FIELDS.USERNAME),
		display_name: readString(view, USER_FIELDS.DISPLAY_NAME),
		avatar: readString(view, USER_FIELDS.AVATAR),
		status: readString(view, USER_FIELDS.STATUS),
		last_seen: readString(view, USER_FIELDS.LAST_SEEN),
	};
}

/**
 * Public E2EE-ключ DTO. Возвращает null, если один из обязательных ключей
 * пуст/отсутствует, чтобы вызывающий код получил детерминированный отказ
 * ("missing key") без fallback на чтение полной записи users.
 */
function toPublicKeyDto(view) {
	const public_key_x25519 = readString(
		view,
		USER_FIELDS.PUBLIC_KEY_X25519,
	).trim();
	const public_key_signing = readString(
		view,
		USER_FIELDS.PUBLIC_KEY_SIGNING,
	).trim();
	if (!public_key_x25519 || !public_key_signing) {
		return null;
	}
	return { id: view.id, public_key_x25519, public_key_signing };
}

/**
 * Дедупликация, отбрасывание не-строк/пустых и ограничение количества id.
 * Никогда не расширяет запрос.
 */
function sanitizeAndCapUserIds(raw) {
	if (!Array.isArray(raw)) {
		return [];
	}
	const seen = new Set();
	const out = [];
	for (const value of raw) {
		if (typeof value !== "string" || !USER_ID_PATTERN.test(value)) {
			continue;
		}
		if (seen.has(value)) {
			continue;
		}
		seen.add(value);
		out.push(value);
		if (out.length >= MAX_USERS_PER_KEYS_REQUEST) {
			break;
		}
	}
	return out;
}

/** Проверяет лимит до усечения, чтобы API не менял состав запроса молча. */
function hasTooManyUserIds(raw) {
	if (!Array.isArray(raw)) {
		return false;
	}
	return (
		new Set(
			raw.filter(
				(value) => typeof value === "string" && USER_ID_PATTERN.test(value),
			),
		).size > MAX_USERS_PER_KEYS_REQUEST
	);
}

/**
 * Строит parameter-bound OR-filter `field = {:prefix0} || ... ` и карту params
 * для произвольного набора значений. Значения всегда передаются через binding,
 * что исключает сборку filter из пользовательского ввода.
 */
function buildOrBoundFilter(field, values, prefix) {
	const params = {};
	const parts = values.map((value, index) => {
		const key = `${prefix}${index}`;
		params[key] = value;
		return `${field} = {:${key}}`;
	});
	return { filter: parts.join(" || "), params };
}

module.exports = {
	USER_PROFILE_TYPE_PUBLIC,
	USER_PROFILE_TYPE_PRIVATE,
	MAX_USERS_PER_KEYS_REQUEST,
	USER_ID_PATTERN,
	USER_FIELDS,
	toPublicProfileSearchDto,
	toAdminUserDto,
	toContactProfileDto,
	toPublicKeyDto,
	sanitizeAndCapUserIds,
	hasTooManyUserIds,
	buildOrBoundFilter,
};
