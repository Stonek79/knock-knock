/**
 * Чистая серверная валидация media-загрузок (P0.3b).
 * Не зависит от PocketBase: принимает конкретные данные (MIME, размер, тип) и
 * возвращает детерминированный результат. Используется в media.pb.js и
 * покрывается контракт-тестами. Зашифрованные bytes не расшифровываются —
 * проверяются только границы MIME/размера.
 */

const MB = 1024 * 1024;

/** Допустимые MIME-префиксы по категории. */
const ALLOWED_MIME_PREFIXES = {
	image: ["image/"],
	video: ["video/"],
	audio: ["audio/"],
	document: ["application/"],
};

/** Лимиты размера (в байтах) по категории. */
const SIZE_LIMITS_BYTES = {
	image: 10 * MB,
	video: 30 * MB,
	audio: 15 * MB,
	document: 50 * MB,
};

/**
 * Определяет категорию вложения по MIME-типу.
 * Возвращает "document" как fallback для application/octet-stream и прочих.
 */
function mimeToCategory(mime) {
	const m = String(mime || "").toLowerCase();
	if (m.startsWith("image/")) {
		return "image";
	}
	if (m.startsWith("video/")) {
		return "video";
	}
	if (m.startsWith("audio/")) {
		return "audio";
	}
	if (m.startsWith("application/")) {
		return "document";
	}
	return null;
}

/**
 * Проверяет, разрешён ли MIME-тип.
 * @returns {boolean}
 */
function isMimeAllowed(mime) {
	return mimeToCategory(mime) !== null;
}

/**
 * Валидирует медиа-загрузку.
 * @param {object} input
 * @param {string} input.mime - MIME-тип загружаемого файла
 * @param {number} input.sizeBytes - размер файла в байтах
 * @param {string} [input.declaredType] - тип, указанный клиентом (image/video/audio/document)
 * @returns {{ok: boolean, error?: string, code?: string}}
 */
function validateMediaUpload({ mime, sizeBytes, declaredType }) {
	const mimeStr = String(mime || "");
	if (!isMimeAllowed(mimeStr)) {
		return {
			ok: false,
			code: "UNSUPPORTED_MIME",
			error: "Тип файла не поддерживается",
		};
	}

	const category = mimeToCategory(mimeStr);
	if (declaredType && declaredType !== category) {
		const declaredTypes = ["image", "video", "audio", "document"];
		if (declaredTypes.includes(declaredType)) {
			return {
				ok: false,
				code: "MIME_TYPE_MISMATCH",
				error: "Тип файла не соответствует содержимому",
			};
		}
	}

	const size = Number(sizeBytes);
	if (!Number.isFinite(size) || size < 0) {
		return {
			ok: false,
			code: "INVALID_SIZE",
			error: "Некорректный размер файла",
		};
	}

	const limit = SIZE_LIMITS_BYTES[category];
	if (size > limit) {
		return {
			ok: false,
			code: "FILE_TOO_LARGE",
			error: "Файл превышает допустимый размер",
		};
	}

	return { ok: true };
}

module.exports = {
	ALLOWED_MIME_PREFIXES,
	SIZE_LIMITS_BYTES,
	mimeToCategory,
	isMimeAllowed,
	validateMediaUpload,
};