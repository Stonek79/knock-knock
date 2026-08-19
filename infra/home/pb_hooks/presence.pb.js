/**
 * @module PresenceHooks
 * @description КНОК-КНОК: серверные маршруты присутствия (P0.3b).
 *
 * Прямой collection-доступ к `presence_status` закрыт (все rules = null).
 * Всё чтение/write присутствия идёт через эти узкие операции, каждая из
 * которых на сервере проверяет auth, ownership своей записи и/или membership
 * в комнате. `encrypted_user_id` здесь — служебное поле записи; на сервере оно
 * сверяется с идентификатором аутентифицированного пользователя. Для общего
 * presence DTO это room-scoped correlation key, а не auth-доказательство и не
 * публичный профиль; технический id записи выдаётся только owner-only DTO для
 * последующего heartbeat.
 */

const PRESENCE_LIMIT = 500;

/** Безопасный display-нейм для участника комнаты (privacy-safe). */
function resolveDisplayName(userRecord) {
	if (!userRecord) {
		return null;
	}
	const PROFILE_TYPE_PUBLIC = "public";
	if (userRecord.getString("profile_type") !== PROFILE_TYPE_PUBLIC) {
		// private/unknown профиль остаётся нейтральным.
		return null;
	}
	const displayName = userRecord.getString("display_name");
	const username = userRecord.getString("username");
	return displayName || username || null;
}

function presenceDto(record, displayName, includeRoom) {
	const dto = {
		id: record.id,
		user_id: record.getString("encrypted_user_id"),
		is_online: record.getBool("is_online"),
		is_typing: record.getBool("is_typing"),
		last_ping: record.getString("last_ping"),
		display_name: displayName,
	};
	if (includeRoom) {
		dto.room_id = record.getString("room_id");
	}
	return dto;
}

function pushSafeError(err, label) {
	console.error(`❌ [PRESENCE_ERROR] ${label}`);
}

/** Находит запись присутствия пользователя по его идентификатору. */
function findOwnRecord(app, DB, userId) {
	return app.findFirstRecordByFilter(
		DB.TABLES.PRESENCE_STATUS,
		`${DB.FIELDS.ENCRYPTED_USER_ID} = {:userId}`,
		{ userId },
	);
}

/** Проверяет membership запрашивающего в комнате. */
function isRoomMember(app, DB, roomId, userId) {
	try {
		const members = app.findRecordsByFilter(
			DB.TABLES.MEMBERS,
			`room = {:roomId} && user = {:userId}`,
			"",
			1,
			0,
			{ roomId, userId },
		);
		return members.length > 0;
	} catch (err) {
		pushSafeError(err, "Проверка membership для presence");
		return false;
	}
}

/**
 * POST /api/custom/presence/me
 * Owner-only upsert/heartbeat: создаёт или обновляет только собственную запись.
 * Body: { is_online?: boolean, record_id?: string }
 */
routerAdd("POST", "/api/custom/presence/me", (e) => {
	const DB = require(`${__hooks}/db.js`);
	const body = e.requestInfo().body || {};
	if (!e.auth) {
		return e.json(401, { code: "UNAUTHORIZED", error: "Не авторизован" });
	}
	const userId = e.auth.id;

	try {
		let record = findOwnRecord($app, DB, userId);

		// record_id передан — убеждаемся, что он принадлежит текущему пользователю.
		if (body.record_id && record && record.id !== body.record_id) {
			return e.json(403, { code: "FORBIDDEN", error: "Нет доступа" });
		}

		const isOnline =
			typeof body.is_online === "boolean" ? body.is_online : true;
		if (!record) {
			record = new Record(
				$app.findCollectionByNameOrId(DB.TABLES.PRESENCE_STATUS),
				{
					[DB.FIELDS.ENCRYPTED_USER_ID]: userId,
					is_online: isOnline,
					last_ping: new Date().toISOString(),
				},
			);
			$app.save(record);
		} else {
			record.set("is_online", isOnline);
			record.set("last_ping", new Date().toISOString());
			$app.save(record);
		}

		return e.json(200, presenceDto(record, null, true));
	} catch (err) {
		pushSafeError(err, "Upsert presence");
		return e.json(500, { code: "INTERNAL_ERROR", error: "Внутренняя ошибка" });
	}
});

/**
 * POST /api/custom/presence/typing
 * Обновляет typing-статус только собственной записи и только в комнате,
 * участником которой является запрашивающий. Body: { record_id, is_typing, room_id }
 */
routerAdd("POST", "/api/custom/presence/typing", (e) => {
	const DB = require(`${__hooks}/db.js`);
	const body = e.requestInfo().body || {};
	if (!e.auth) {
		return e.json(401, { code: "UNAUTHORIZED", error: "Не авторизован" });
	}
	const userId = e.auth.id;
	const roomId = typeof body.room_id === "string" ? body.room_id.trim() : "";
	const isTyping = body.is_typing === true;

	if (isTyping && !roomId) {
		return e.json(400, {
			code: "INVALID_REQUEST",
			error: "room_id обязателен при печати",
		});
	}
	if (roomId && !isRoomMember($app, DB, roomId, userId)) {
		return e.json(403, { code: "ROOM_ACCESS_DENIED", error: "Нет доступа" });
	}

	try {
		let record = findOwnRecord($app, DB, userId);
		if (body.record_id && record && record.id !== body.record_id) {
			return e.json(403, { code: "FORBIDDEN", error: "Нет доступа" });
		}
		if (!record) {
			record = new Record(
				$app.findCollectionByNameOrId(DB.TABLES.PRESENCE_STATUS),
				{
					[DB.FIELDS.ENCRYPTED_USER_ID]: userId,
					is_online: true,
					is_typing: isTyping,
					room_id: isTyping ? roomId : "",
					last_ping: new Date().toISOString(),
				},
			);
			$app.save(record);
		} else {
			record.set("is_typing", isTyping);
			record.set("room_id", isTyping ? roomId : "");
			record.set("last_ping", new Date().toISOString());
			$app.save(record);
		}
		return e.json(200, presenceDto(record, null, true));
	} catch (err) {
		pushSafeError(err, "Typing update");
		return e.json(500, { code: "INTERNAL_ERROR", error: "Внутренняя ошибка" });
	}
});
/**
 * GET /api/custom/presence/room/:roomId
 * Возвращает печатающих участников комнаты (membership-gated).
 * Не раскрывает технические идентификаторы других записей.
 */
routerAdd("GET", "/api/custom/presence/room/:roomId", (e) => {
	const DB = require(`${__hooks}/db.js`);
	if (!e.auth) {
		return e.json(401, { code: "UNAUTHORIZED", error: "Не авторизован" });
	}
	const userId = e.auth.id;
	const roomId = e.request.pathValue("roomId");
	if (!roomId) {
		return e.json(400, { code: "INVALID_REQUEST", error: "roomId обязателен" });
	}

	if (!isRoomMember($app, DB, roomId, userId)) {
		return e.json(403, { code: "ROOM_ACCESS_DENIED", error: "Нет доступа" });
	}

	try {
		const records = $app.findRecordsByFilter(
			DB.TABLES.PRESENCE_STATUS,
			`room_id = {:roomId} && is_typing = true && encrypted_user_id != {:userId}`,
			"",
			PRESENCE_LIMIT,
			0,
			{ roomId, userId },
		);
		const result = records.map((record) => {
			const targetId = record.getString("encrypted_user_id");
			let userRecord = null;
			try {
				userRecord = $app.findRecordById(DB.TABLES.USERS, targetId);
			} catch (err) {
				pushSafeError(err, "Резолв пользователя presence");
			}
			return {
				user_id: targetId,
				is_typing: record.getBool("is_typing"),
				last_ping: record.getString("last_ping"),
				display_name: resolveDisplayName(userRecord),
			};
		});
		return e.json(200, result);
	} catch (err) {
		pushSafeError(err, "Room presence read");
		return e.json(500, { code: "INTERNAL_ERROR", error: "Внутренняя ошибка" });
	}
});

/**
 * GET /api/custom/presence/shared
 * Возвращает присутствие пользователей, с которыми запрашивающий имеет общую
 * комнату (плюс собственную запись). Заменяет закрытый глобальный list/view.
 * Отдаёт только { user_id, is_online, last_ping } без глобального списка.
 */
routerAdd("GET", "/api/custom/presence/shared", (e) => {
	const DB = require(`${__hooks}/db.js`);
	if (!e.auth) {
		return e.json(401, { code: "UNAUTHORIZED", error: "Не авторизован" });
	}
	const userId = e.auth.id;

	try {
		const myMembers = $app.findRecordsByFilter(
			DB.TABLES.MEMBERS,
			`user = {:userId}`,
			"",
			PRESENCE_LIMIT,
			0,
			{ userId },
		);
		const roomIds = [
			...new Set(myMembers.map((m) => m.getString(DB.FIELDS.ROOM))),
		];
		const peerIds = [];
		if (roomIds.length > 0) {
			const roomOr = roomIds
				.map((_, i) => `${DB.FIELDS.ROOM} = {:rid${i}}`)
				.join(" || ");
			const params = {};
			roomIds.forEach((id, i) => (params[`rid${i}`] = id));
			const members = $app.findRecordsByFilter(
				DB.TABLES.MEMBERS,
				`(${roomOr}) && ${DB.FIELDS.USER} != {:uid}`,
				"",
				PRESENCE_LIMIT,
				0,
				Object.assign({ uid: userId }, params),
			);
			for (const m of members) {
				peerIds.push(m.getString(DB.FIELDS.USER));
			}
		}
		peerIds.push(userId);
		const uniqueIds = [...new Set(peerIds)];

		const result = [];
		for (const id of uniqueIds) {
			let record = null;
			try {
				record = findOwnRecord($app, DB, id);
			} catch (err) {
				pushSafeError(err, "Чтение presence shared");
			}
			if (!record) {
				continue;
			}
			result.push({
				user_id: id,
				is_online: record.getBool("is_online"),
				last_ping: record.getString("last_ping"),
			});
		}
		return e.json(200, result);
	} catch (err) {
		pushSafeError(err, "Shared presence read");
		return e.json(500, { code: "INTERNAL_ERROR", error: "Внутренняя ошибка" });
	}
});

module.exports = {};
