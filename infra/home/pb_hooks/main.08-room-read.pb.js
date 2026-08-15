// Входит в модуль decomposition-набора main.0X: содержимое перенесено
// из main.pb.js с сохранением contract, middleware и логики.
// room read: отметка сообщений прочитанными.
/**
 * POST /api/custom/rooms/:roomId/read
 * Отмечает все чужие сообщения в комнате как прочитанные.
 * Использует PocketBase ORM-запросы с ограниченным размером выборки, чтобы
 * сохранить Realtime-события при обновлении статуса.
 */
routerAdd(
	"POST",
	"/api/custom/rooms/:roomId/read",
	(e) => {
		const DB = require(`${__hooks}/db.js`);
		const user = e.auth;
		const roomId = e.request.pathValue("roomId");

		if (!roomId) {
			return e.json(400, { message: "Room ID is required" });
		}

		try {
			// 1. ПРОВЕРКА БЕЗОПАСНОСТИ: Убедимся, что пользователь является участником комнаты.
			// Заодно получим его last_read_at, чтобы знать, до какого момента помечать сообщения.
			let memberRecords;
			try {
				memberRecords = $app.findRecordsByFilter(
					DB.TABLES.MEMBERS,
					`${DB.FIELDS.ROOM} = {:roomId} && ${DB.FIELDS.USER} = {:userId}`,
					"",
					1,
					0,
					{ roomId: roomId, userId: user.id },
				);
			} catch {
				return e.json(500, {
					message: "Unable to verify room membership.",
				});
			}
			if (memberRecords.length === 0) {
				return e.json(403, {
					message: "Access denied. You are not a member of this room.",
				});
			}

			const memberRecord = memberRecords[0];
			const lastReadAt = memberRecord.getString(DB.FIELDS.LAST_READ_AT);
			if (!lastReadAt) {
				return e.json(200, {
					success: true,
					updated: 0,
					message: "No last_read_at set",
				});
			}

			// 2. ИЩЕМ СООБЩЕНИЯ:
			// Используем ORM для сохранения Realtime событий для других участников чата.
			// ВАЖНО: Помечаем прочитанными только те сообщения, которые созданы <= last_read_at.
			// Это гарантирует, что новые сообщения, находящиеся ниже видимой зоны, не будут прочитаны досрочно.
			const records = $app.findRecordsByFilter(
				DB.TABLES.MESSAGES,
				`${DB.FIELDS.ROOM} = {:roomId} && ${DB.FIELDS.SENDER} != {:userId} && ${DB.FIELDS.STATUS} != 'read' && created <= {:lastReadAt}`,
				"",
				1000,
				0,
				{ roomId: roomId, userId: user.id, lastReadAt: lastReadAt },
			);

			let affected = 0;
			for (const r of records) {
				r.set(DB.FIELDS.STATUS, "read");
				// saveNoValidate сохраняет запись в обход валидаторов и хука onRecordUpdateRequest,
				// но ГЕНЕРИРУЕТ события Realtime
				$app.saveNoValidate(r);
				affected++;
			}

			return e.json(200, {
				success: true,
				updated: affected,
				message: `Успешно отмечено как прочитанное: ${affected}`,
			});
		} catch (err) {
			console.error(`❌ [READ_MESSAGES_ERROR]: ${err.message || err}`);
			return e.json(500, { message: "Internal server error" });
		}
	},
	$apis.requireAuth(),
);
