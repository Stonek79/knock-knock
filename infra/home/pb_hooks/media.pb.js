/**
 * @module MediaHooks
 * @description КНОК-КНОК: серверная защита коллекции `media` (P0.3b).
 *
 * Схема закрывает глобальное чтение (list/view — membership/owner), а этот hook
 * является дополнительным fail-closed слоем: создание chat media требует
 * реальной связи `room` и membership запрашивающего, room-less media разрешена
 * только суперпользовательскому (vault/broadcast) пути. MIME/size проверяются
 * на сервере независимо от клиента; зашифрованные bytes не расшифровываются.
 */

const MEDIA_VALIDATION = require(`${__hooks}/media_validation.js`);
const { SUPERUSERS_COLLECTION_NAME } = require(`${__hooks}/hook_constants.js`);

function isSuperuser(e) {
	return e.auth && e.auth.collection().name === SUPERUSERS_COLLECTION_NAME;
}

/** Проверяет membership запрашивающего в комнате. */
function isRoomMember(roomId, userId) {
	try {
		const DB = require(`${__hooks}/db.js`);
		const members = $app.findRecordsByFilter(
			DB.TABLES.MEMBERS,
			`room = {:roomId} && user = {:userId}`,
			"",
			1,
			0,
			{ roomId, userId },
		);
		return members.length > 0;
	} catch (err) {
		console.error(`❌ [MEDIA_ERROR] Проверка membership: ${err?.message || err}`);
		return false;
	}
}

function isSystemBroadcast(record) {
	const references = record.get("references");
	if (references && typeof references === "object") {
		return references.isSystemBroadcast === true;
	}
	if (typeof references === "string") {
		try {
			return JSON.parse(references).isSystemBroadcast === true;
		} catch (_err) {
			return false;
		}
	}
	return false;
}

/**
 * Извлекает MIME/размер/имя именно из загруженного файла запроса.
 *
 * `record.get("file")` до сохранения записи содержит только значение поля,
 * а не загруженный multipart-файл. Поэтому серверная проверка должна читать
 * upload через API события, иначе обычный upload будет ошибочно выглядеть как
 * файл без MIME и размера.
 */
function readFileInfo(event, fieldName = "file") {
	let file = null;
	try {
		const uploadedFiles = event.findUploadedFiles(fieldName);
		file = Array.isArray(uploadedFiles) ? uploadedFiles[0] : null;
	} catch (err) {
		/* отсутствие upload API — fail-closed ниже */
	}
	if (!file || typeof file !== "object") {
		return { mime: "", size: Number.NaN, name: "" };
	}
	const mime =
		typeof file.type === "string"
			? file.type
			: typeof file.mimeType === "string"
				? file.mimeType
				: "";
	let size = Number.NaN;
	if (typeof file.size === "number") {
		size = file.size;
	} else if (typeof file.size === "string" && file.size.trim() !== "") {
		size = Number(file.size);
	}
	const name =
		typeof file.name === "string"
			? file.name
			: typeof file.filename === "string"
				? file.filename
				: "";
	return { mime, size, name };
}

onRecordCreateRequest((e) => {
	const collectionName = e.record.collection().name;
	if (collectionName !== "media") {
		return e.next();
	}

	// Суперпользовательский (vault/broadcast) путь: разрешён room-less, но
	// MIME/size всё равно проверяются на сервере (defense in depth).
	if (isSuperuser(e)) {
		const fileInfo = readFileInfo(e);
		const validation = MEDIA_VALIDATION.validateMediaUpload({
			mime: fileInfo.mime,
			sizeBytes: fileInfo.size,
		});
		if (!validation.ok) {
			throw new BadRequestError(validation.error);
		}
		return e.next();
	}

	const userId = e.auth ? e.auth.id : null;
	if (!userId) {
		throw new ForbiddenError("MediaPolicy: требуется авторизация");
	}

	const createdBy = e.record.getString("created_by");
	if (createdBy !== userId) {
		throw new ForbiddenError("MediaPolicy: нельзя создать медиа от чужого имени");
	}

	if (e.record.getBool("is_vault")) {
		throw new ForbiddenError(
			"MediaPolicy: vault media создаётся только серверным путём",
		);
	}

	if (isSystemBroadcast(e.record)) {
		throw new ForbiddenError(
			"MediaPolicy: system broadcast создаётся только серверным путём",
		);
	}

	const roomId = e.record.getString("room");
	if (!roomId) {
		throw new BadRequestError(
			"MediaPolicy: chat media требует связь с комнатой",
		);
	}

	if (!isRoomMember(roomId, userId)) {
		throw new ForbiddenError("MediaPolicy: нет доступа к комнате");
	}

	const fileInfo = readFileInfo(e);
	const declaredType = e.record.getString("type") || undefined;
	const validation = MEDIA_VALIDATION.validateMediaUpload({
		mime: fileInfo.mime,
		sizeBytes: fileInfo.size,
		declaredType,
	});
	if (!validation.ok) {
		throw new BadRequestError(validation.error);
	}

	e.next();
}, "media");

// The marker is server-owned on updates as well. Without this guard an owner
// could turn an ordinary protected media record into a globally retrievable
// broadcast file after creation.
onRecordUpdateRequest((e) => {
	if (e.record.collection().name !== "media") {
		return e.next();
	}
	if (isSuperuser(e)) {
		return e.next();
	}
	if (isSystemBroadcast(e.record)) {
		throw new ForbiddenError(
			"MediaPolicy: system broadcast marker доступен только серверному пути",
		);
	}
	e.next();
}, "media");
