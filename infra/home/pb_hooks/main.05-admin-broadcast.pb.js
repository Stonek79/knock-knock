// Входит в модуль decomposition-набора main.0X: содержимое перенесено
// из main.pb.js с сохранением contract, middleware и логики.
// admin broadcast: create history delete и миграция системных комнат.
/**
 * POST /api/custom/broadcast
 * Эндпоинт для отправки Broadcast-сообщений администратором.
 */
routerAdd(
	"POST",
	"/api/custom/broadcast",
	(e) => {
		const DB = require(`${__hooks}/db.js`);
		const { SUPERUSERS_COLLECTION_NAME } = require(
			`${__hooks}/hook_constants.js`,
		);
		const user = e.auth;

		const isAdmin = user.collection().name === SUPERUSERS_COLLECTION_NAME;
		if (!isAdmin) {
			return e.json(403, { message: "Forbidden: Admins only" });
		}

		const info = e.requestInfo();

		// Основной способ (PocketBase v0.23+): requestInfo().body
		let bodyData = info?.body || {};

		// Fallback: если body пустой — читаем сырое тело и парсим сами.
		// В PocketBase v0.25+ при использовании routerAdd с middleware
		// тело иногда не попадает в requestInfo().body автоматически.
		if (!bodyData.text && !bodyData.attachments) {
			try {
				const rawBody = toString(e.request.body);
				if (rawBody) {
					bodyData = JSON.parse(rawBody);
				}
			} catch (parseErr) {
				console.error(`[BROADCAST] Ошибка парсинга raw body: ${parseErr}`);
			}
		}

		const text = typeof bodyData.text === "string" ? bodyData.text : "";
		const attachments = Array.isArray(bodyData.attachments)
			? bodyData.attachments
			: [];

		if (!text || typeof text !== "string" || text.trim() === "") {
			if (attachments.length === 0) {
				return e.json(400, { message: "Text or attachments required" });
			}
		}

		const taskCollection = $app.findCollectionByNameOrId(DB.TABLES.TASK_QUEUE);
		const task = new Record(taskCollection);

		const broadcastId = `broadcast_${Date.now()}`;
		task.set(DB.FIELDS.TASK_KEY, broadcastId);
		task.set(DB.FIELDS.TYPE, DB.VALUES.TASK_TYPE_BROADCAST);
		task.set(DB.FIELDS.PAYLOAD, {
			text: text,
			attachments: attachments,
			adminId: user.id,
		});
		task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_PENDING);
		task.set(
			DB.FIELDS.RUN_AT,
			new Date().toISOString().replace("T", " ").split(".")[0],
		);

		$app.save(task);

		return e.json(200, { success: true, message: "Broadcast task created" });
	},
	$apis.requireAuth(),
);

/**
 * GET /api/custom/broadcast/history
 * Возвращает историю рассылок (записи task_queue с типом 'broadcast').
 * Прямой доступ к коллекции закрыт правилами PocketBase, поэтому
 * используем серверный хук, который работает с привилегиями приложения.
 */
routerAdd(
	"GET",
	"/api/custom/broadcast/history",
	(e) => {
		const DB = require(`${__hooks}/db.js`);
		const { SUPERUSERS_COLLECTION_NAME } = require(
			`${__hooks}/hook_constants.js`,
		);
		const user = e.auth;

		if (user.collection().name !== SUPERUSERS_COLLECTION_NAME) {
			return e.json(403, { message: "Forbidden: Admins only" });
		}

		try {
			const records = $app.findRecordsByFilter(
				DB.TABLES.TASK_QUEUE,
				`type = '${DB.VALUES.TASK_TYPE_BROADCAST}'`,
				"-created",
				50,
				0,
			);

			const items = records.map((r) => {
				const payload = r.get(DB.FIELDS.PAYLOAD) || {};
				const attachmentIds = payload.attachments || [];
				const mediaAttachments = [];

				for (let i = 0; i < attachmentIds.length; i++) {
					try {
						const mediaRecord = $app.findRecordById(
							DB.TABLES.MEDIA,
							attachmentIds[i],
						);
						if (mediaRecord) {
							mediaAttachments.push({
								id: mediaRecord.id,
								file_name: mediaRecord.getString("file"),
								file_size: mediaRecord.getInt("size"),
								content_type: mediaRecord.getString("mime_type"),
								type: mediaRecord.getString("type"),
							});
						}
					} catch (mediaErr) {
						console.error(
							"Failed to load media info for broadcast history:",
							mediaErr,
						);
					}
				}

				return {
					id: r.id,
					task_key: r.getString(DB.FIELDS.TASK_KEY),
					type: r.getString(DB.FIELDS.TYPE),
					status: r.getString(DB.FIELDS.STATUS),
					payload: {
						text: payload.text || "",
						adminId: payload.adminId || "",
						attachments: attachmentIds,
						mediaAttachments: mediaAttachments,
					},
					created: r.getString(DB.FIELDS.CREATED),
					updated: r.getString(DB.FIELDS.UPDATED),
				};
			});

			return e.json(200, {
				page: 1,
				perPage: 50,
				totalItems: items.length,
				totalPages: 1,
				items,
			});
		} catch (err) {
			console.error("Broadcast history error:", err);
			return e.json(500, { message: "Internal server error" });
		}
	},
	$apis.requireAuth(),
);

/**
 * GET /api/custom/broadcast/media/:id/:filename
 * Серверная выдача системного broadcast-файла.
 *
 * Файл media остаётся protected и не получает глобальное viewRule. Этот
 * маршрут — единственная явная server-owned выдача: он требует auth, находит
 * только media с неподлежающей подделке клиентом меткой broadcast и отдаёт
 * файл через PocketBase filesystem (включая MinIO backend).
 */
routerAdd(
	"GET",
	"/api/custom/broadcast/media/:id/:filename",
	(e) => {
		if (!e.auth) {
			return e.json(401, { code: "UNAUTHORIZED", error: "Не авторизован" });
		}

		const DB = require(`${__hooks}/db.js`);
		const mediaId = e.request.pathValue("id");
		const filename = e.request.pathValue("filename");
		if (!mediaId || !filename || filename.includes("/")) {
			return e.json(404, { code: "NOT_FOUND", error: "Файл не найден" });
		}

		try {
			const mediaRecord = $app.findRecordById(DB.TABLES.MEDIA, mediaId);
			if (!mediaRecord) {
				return e.json(404, { code: "NOT_FOUND", error: "Файл не найден" });
			}

			let references = mediaRecord.get("references");
			if (typeof references === "string") {
				try {
					references = JSON.parse(references);
				} catch (_err) {
					references = null;
				}
			}
			if (!references || references.isSystemBroadcast !== true) {
				return e.json(404, { code: "NOT_FOUND", error: "Файл не найден" });
			}
			const creatorId = mediaRecord.getString("created_by");
			if (!creatorId || !$app.findRecordById(DB.TABLES.USERS, creatorId)) {
				return e.json(404, { code: "NOT_FOUND", error: "Файл не найден" });
			}

			if (mediaRecord.getString("file") !== filename) {
				return e.json(404, { code: "NOT_FOUND", error: "Файл не найден" });
			}

			const fs = $app.newFilesystem();
			try {
				fs.serve(
					e.response,
					e.request,
					`${mediaRecord.baseFilesPath()}/${filename}`,
					filename,
				);
			} finally {
				fs.close();
			}
		} catch (_err) {
			console.error("[BROADCAST_MEDIA] Ошибка выдачи файла");
			return e.json(404, { code: "NOT_FOUND", error: "Файл не найден" });
		}
	},
	$apis.requireAuth(),
);

/**
 * DELETE /api/custom/broadcast/:id
 * Эндпоинт для отзыва (жесткого удаления) Broadcast-сообщения администратором.
 */
routerAdd(
	"DELETE",
	"/api/custom/broadcast/:id",
	(e) => {
		const DB = require(`${__hooks}/db.js`);
		const { SUPERUSERS_COLLECTION_NAME } = require(
			`${__hooks}/hook_constants.js`,
		);
		const user = e.auth;

		if (user.collection().name !== SUPERUSERS_COLLECTION_NAME) {
			return e.json(403, { message: "Forbidden: Admins only" });
		}

		const broadcastId = e.request.pathValue("id");
		if (!broadcastId) {
			return e.json(400, { message: "Broadcast ID is required" });
		}

		try {
			// В PocketBase v0.23 фильтрация по JSON-полям делается через Like оператор или json_extract
			const messages = $app.findRecordsByFilter(
				DB.TABLES.MESSAGES,
				"metadata~{:broadcastMetadata}",
				"",
				100000,
				0,
				{ broadcastMetadata: `'"broadcast_id":"${broadcastId}"'` },
			);

			for (const msg of messages) {
				$app.delete(msg);
			}

			// Находим саму задачу
			const tasks = $app.findRecordsByFilter(
				DB.TABLES.TASK_QUEUE,
				"task_key = {:taskKey}",
				"",
				1,
				0,
				{ taskKey: broadcastId },
			);

			if (tasks.length > 0) {
				const task = tasks[0];
				const payload = task.get(DB.FIELDS.PAYLOAD) || {};
				const attachments = payload.attachments || [];

				$app.delete(task);

				// Пытаемся удалить вложения
				for (const mediaId of attachments) {
					try {
						const mediaRecord = $app.findRecordById(DB.TABLES.MEDIA, mediaId);
						$app.delete(mediaRecord);
					} catch (err) {
						console.error(`Failed to delete media ${mediaId}:`, err);
					}
				}
			}

			return e.json(200, { success: true, deleted: messages.length });
		} catch (err) {
			console.error("Broadcast delete error:", err);
			return e.json(500, { message: "Internal server error" });
		}
	},
	$apis.requireAuth(),
);

/**
 * POST /api/custom/admin/migrate-system-rooms
 * Одноразовая миграция: создаёт системные комнаты для пользователей,
 * зарегистрировавшихся ДО внедрения функционала Broadcast.
 * Операция идемпотентна — безопасна для повторного вызова.
 */
routerAdd(
	"POST",
	"/api/custom/admin/migrate-system-rooms",
	(e) => {
		const DB = require(`${__hooks}/db.js`);
		const { SUPERUSERS_COLLECTION_NAME } = require(
			`${__hooks}/hook_constants.js`,
		);
		const user = e.auth;

		if (user.collection().name !== SUPERUSERS_COLLECTION_NAME) {
			return e.json(403, { message: "Forbidden: Admins only" });
		}

		try {
			const roomCollection = $app.findCollectionByNameOrId(DB.TABLES.ROOMS);
			const memberCollection = $app.findCollectionByNameOrId(DB.TABLES.MEMBERS);

			// Индексируем все существующие системные комнаты
			const existingSysRooms = $app.findRecordsByFilter(
				DB.TABLES.ROOMS,
				`type = 'system'`,
				"",
				100000,
				0,
			);
			const existingRoomIds = {};
			for (const r of existingSysRooms) {
				existingRoomIds[r.id] = true;
			}

			// Проходим всех пользователей
			const allUsers = $app.findRecordsByFilter(
				DB.TABLES.USERS,
				"",
				"",
				100000,
				0,
			);

			let createdCount = 0;
			let skippedCount = 0;

			for (const u of allUsers) {
				const deterministicId = $security.md5(`${u.id}system`).substring(0, 15);

				if (existingRoomIds[deterministicId]) {
					skippedCount++;
					continue;
				}

				try {
					const sysRoom = new Record(roomCollection, {
						[DB.FIELDS.ID]: deterministicId,
						[DB.FIELDS.TYPE]: "system",
						[DB.FIELDS.NAME]: "Nemo System",
						[DB.FIELDS.VISIBILITY]: DB.VALUES.VISIBILITY_PRIVATE,
						[DB.FIELDS.CREATED_BY]: u.id,
					});
					$app.saveNoValidate(sysRoom);

					const sysMember = new Record(memberCollection, {
						[DB.FIELDS.ROOM]: sysRoom.id,
						[DB.FIELDS.USER]: u.id,
						[DB.FIELDS.ROLE]: "member",
						[DB.FIELDS.UNREAD_COUNT]: 0,
					});
					$app.saveNoValidate(sysMember);

					createdCount++;
					console.log(
						`✅ [MIGRATE_ROOMS] Создана системная комната для пользователя ${u.id}`,
					);
				} catch (createErr) {
					console.error(
						`❌ [MIGRATE_ROOMS] Ошибка создания для ${u.id}: ${createErr.message || createErr}`,
					);
				}
			}

			console.log(
				`✅ [MIGRATE_ROOMS] Готово. Создано: ${createdCount}, уже существовало: ${skippedCount}`,
			);

			return e.json(200, {
				success: true,
				created: createdCount,
				skipped: skippedCount,
			});
		} catch (err) {
			console.error(`❌ [MIGRATE_ROOMS] Общая ошибка: ${err.message || err}`);
			return e.json(500, { message: "Internal server error" });
		}
	},
	$apis.requireAuth(),
);
