/**
 * @module MainHooks
 * @description КНОК-КНОК: ОСНОВНЫЕ СЕРВЕРНЫЕ ХУКИ
 *
 * Файл содержит логику инициализации пользователей, очистки данных
 * и интеграции с асинхронным Task Runner для уведомлений.
 */

/**
 * 1. ИНИЦИАЛИЗАЦИЯ ИЗБРАННОГО
 * Создает персональную комнату "Избранное" при успешной регистрации.
 */
onRecordAfterCreateSuccess((e) => {
	const DB = require(`${__hooks}/db.js`);
	const user = e.record;

	console.log(
		`🚀 [REG_DEBUG] Начало инициализации Избранного для пользователя: ${user.email()} (ID: ${user.id})`,
	);

	// Генерация детерминированного ID для комнаты на основе ID пользователя
	const rawHash = $security.md5(`"${DB.VALUES.PREFIX_SELF_CHAT}" ${user.id}`);
	const deterministicId = rawHash.slice(0, 15);

	console.log(
		`🔍 [REG_DEBUG] Сгенерированный ID комнаты Избранного: ${deterministicId}`,
	);

	// Безопасная проверка существования комнаты без генерации исключений в БД
	let rooms = [];
	try {
		rooms = e.app.findRecordsByFilter(
			DB.TABLES.ROOMS,
			`id = '${deterministicId}'`,
			"",
			1,
			0,
		);
	} catch (filterErr) {
		console.error(
			`❌ [REG_DEBUG_ERROR] Ошибка при проверке существования комнаты: ${filterErr.message || filterErr}`,
		);
	}

	if (rooms.length > 0) {
		console.log(
			`ℹ️ [REG_DEBUG] Избранное уже существует для пользователя: ${user.email()} (Room ID: ${deterministicId}). Создание не требуется.`,
		);
		e.next();
		return;
	}

	console.log(`📦 [REG_DEBUG] Комната Избранного не найдена. Создаем новую...`);

	try {
		const roomCollection = e.app.findCollectionByNameOrId(DB.TABLES.ROOMS);
		const memberCollection = e.app.findCollectionByNameOrId(DB.TABLES.MEMBERS);

		console.log(`🔐 [REG_DEBUG] Создаем комнату...`);

		// Создание комнаты
		const room = new Record(roomCollection, {
			[DB.FIELDS.ID]: deterministicId,
			[DB.FIELDS.TYPE]: DB.VALUES.ROOM_TYPE_DIRECT,
			[DB.FIELDS.NAME]: DB.VALUES.FAVORITES_NAME,
			[DB.FIELDS.VISIBILITY]: DB.VALUES.VISIBILITY_PRIVATE,
			[DB.FIELDS.CREATED_BY]: user.id,
		});
		e.app.saveNoValidate(room);

		console.log(`🔐 [REG_DEBUG] Комната создана. Добавляем участника...`);

		// Добавление единственного участника (себя)
		const member = new Record(memberCollection, {
			[DB.FIELDS.ROOM]: room.id,
			[DB.FIELDS.USER]: user.id,
			[DB.FIELDS.ROLE]: DB.VALUES.ROLE_OWNER,
			[DB.FIELDS.UNREAD_COUNT]: 0,
		});
		e.app.saveNoValidate(member);

		console.log(
			`⭐ [REG] Избранное успешно создано и записано для: ${user.username() || user.email()}`,
		);

		// Обновляем инвайт
		const inviteId = user.get("invite_code");
		if (inviteId) {
			try {
				const invite = e.app.findRecordById("invites", inviteId);
				invite.set("status", "used");
				invite.set("used_by", user.id);
				e.app.saveNoValidate(invite);
			} catch (err) {
				console.error(`❌ Ошибка обновления инвайта: ${err}`);
			}
		}

		// Создание системной комнаты (Knock-Knock)
		const sysDeterministicId = $security.md5(`${user.id}system`).substring(0, 15);
		const sysRoom = new Record(roomCollection, {
			[DB.FIELDS.ID]: sysDeterministicId,
			[DB.FIELDS.TYPE]: "system",
			[DB.FIELDS.NAME]: "Knock-Knock System",
			[DB.FIELDS.VISIBILITY]: DB.VALUES.VISIBILITY_PRIVATE,
			[DB.FIELDS.CREATED_BY]: user.id,
		});
		e.app.saveNoValidate(sysRoom);

		const sysMember = new Record(memberCollection, {
			[DB.FIELDS.ROOM]: sysRoom.id,
			[DB.FIELDS.USER]: user.id,
			[DB.FIELDS.ROLE]: "member", // обычный участник (только чтение на фронтенде)
			[DB.FIELDS.UNREAD_COUNT]: 0,
		});
		e.app.saveNoValidate(sysMember);
	} catch (err) {
		console.error(
			`❌ [REG_ERROR] Ошибка при создании Избранного: ${err.message || err}`,
		);
	}

	e.next();
}, "users");

/**
 * 2. КАСКАДНОЕ УДАЛЕНИЕ ДАННЫХ
 * Удаляет связанные файлы и личные чаты при удалении пользователя.
 */
onRecordAfterDeleteSuccess((e) => {
	const DB = require(`${__hooks}/db.js`);
	const user = e.record;

	// Удаление медиафайлов
	try {
		const mediaRecords = e.app.findRecordsByFilter(
			DB.TABLES.MEDIA,
			`${DB.FIELDS.CREATED_BY} = {:uid}`,
			"-created",
			500,
			0,
			{ uid: user.id },
		);
		for (const rec of mediaRecords) {
			e.app.deleteNoValidate(rec);
		}
	} catch (err) {
		console.error(`❌ [CLEANUP_ERROR] Медиа: ${err}`);
	}

	// Удаление личных диалогов
	try {
		const memberRecords = e.app.findRecordsByFilter(
			DB.TABLES.MEMBERS,
			`${DB.FIELDS.USER} = {:uid}`,
			"-created",
			1000,
			0,
			{ uid: user.id },
		);

		for (const member of memberRecords) {
			const roomId = member.get(DB.FIELDS.ROOM);
			const room = e.app.findRecordById(DB.TABLES.ROOMS, roomId);

			if (room && room.get(DB.FIELDS.TYPE) === DB.VALUES.ROOM_TYPE_DIRECT) {
				e.app.deleteNoValidate(room);
				console.log(`🗑️ [CLEANUP] Удален личный чат: ${room.id}`);
			}
		}
	} catch (err) {
		console.error(`❌ [CLEANUP_ERROR] Комнаты: ${err}`);
	}

	e.next();
}, "users");

/**
 * 3. КОНТРОЛЬ РЕГИСТРАЦИИ (АНТИБОТ)
 * Генерирует tokenKey и проверяет защиту Honeypot/Time-check.
 */
onRecordCreateRequest((e) => {
	const DB = require(`${__hooks}/db.js`);
	try {
		const info =
			typeof e.requestInfo === "function" ? e.requestInfo() : e.requestInfo;
		const data = info?.Data || info?.data || {};

		// Автогенерация tokenKey для безопасности API
		if (!e.record.get(DB.FIELDS.TOKEN_KEY)) {
			e.record.set(DB.FIELDS.TOKEN_KEY, $security.randomString(30));
		}

		// Синхронизация подтверждения пароля
		if (!e.record.get(DB.FIELDS.PASSWORD_CONFIRM)) {
			const password = data.password;
			if (password) {
				e.record.set(DB.FIELDS.PASSWORD_CONFIRM, password);
			}
		}

		// Пропускаем проверки для администраторов
		const isSuperuser = e.hasSuperuserAuth?.() || e.get?.(DB.FIELDS.ADMIN);
		if (isSuperuser) {
			return e.next();
		}

		// Ловушка для ботов (Honeypot)
		if (data[DB.FIELDS.USERNAME_BOT]) {
			throw $errors.badRequest("Bot detected (honeypot)");
		}

		// Проверка времени заполнения формы
		const startTimeStr = data[DB.FIELDS.START_TIME];
		const start = parseInt(startTimeStr || "0", 10);
		if (startTimeStr && Date.now() - start < 2000) {
			throw $errors.badRequest("Bot detected (too fast)");
		}

		// Проверка инвайт-кода
		const inviteCodeRaw = data.invite_code;
		if (!inviteCodeRaw) {
			throw $errors.badRequest("Invite code is required");
		}
		const invites = e.app.findRecordsByFilter(
			"invites",
			`code = '${inviteCodeRaw}' && status = 'active'`,
			"",
			1,
			0,
		);
		if (invites.length === 0) {
			throw $errors.badRequest("Invalid or inactive invite code");
		}
		const invite = invites[0];

		// Подменяем код на id инвайта для связи
		e.record.set("invite_code", invite.id);
	} catch (err) {
		if (err.message?.includes("Bot detected")) {
			throw err;
		}
		console.error("❌ [HOOK_CRASH]:", err.message || err);
	}

	return e.next();
}, "users");

/**
 * 4. ПОСТАНОВКА ЗАДАЧ ТИПА PUSH
 * Создает задачу в очереди при появлении нового сообщения.
 */
onRecordAfterCreateSuccess((e) => {
	const DB = require(`${__hooks}/db.js`);
	const message = e.record;

	// Игнорируем сервисные сообщения
	if (message.get(DB.FIELDS.TYPE) === DB.VALUES.TYPE_SYSTEM) {
		e.next();
		return;
	}

	try {
		const roomId = message.get(DB.FIELDS.ROOM);
		const senderId = message.get(DB.FIELDS.SENDER);

		// Получаем имя отправителя для уведомления
		let senderName = "Knock-Knock";
		try {
			const senderRecord = e.app.findRecordById("users", senderId);
			if (senderRecord) {
				senderName =
					senderRecord.get("name") ||
					senderRecord.get("username") ||
					"Пользователь";
			}
		} catch (err) {
			console.error(
				`❌ [PUSH_QUEUE_ERROR] Ошибка получения имени отправителя: ${err.message || err}`,
			);
			// игнорируем ошибку
		}

		// Поиск получателей уведомления
		const members = e.app.findRecordsByFilter(
			DB.TABLES.MEMBERS,
			`${DB.FIELDS.ROOM} = {:roomId} && ${DB.FIELDS.USER} != {:senderId}`,
			"",
			100,
			0,
			{ roomId: roomId, senderId: senderId },
		);

		if (members.length === 0) {
			e.next();
			return;
		}

		const userIds = members.map((m) => m.get(DB.FIELDS.USER));

		// Фильтруем получателей, которые сейчас онлайн (чтобы не спамить пушами)
		const offlineUserIds = [];
		for (const uid of userIds) {
			try {
				const presenceRecords = e.app.findRecordsByFilter(
					"presence_status",
					"user = {:uid}",
					"-created",
					1,
					0,
					{ uid: uid },
				);

				if (presenceRecords.length > 0) {
					const p = presenceRecords[0];
					const isOnline = p.getBool("is_online");
					const lastPingStr = p.getDateTime("last_ping").string();

					let isRecent = false;
					if (lastPingStr) {
						// Pocketbase возвращает DateTime, переводим в JS Date (учитывая UTC)
						const lastPingDate = new Date(`${lastPingStr.replace(" ", "T")}Z`);
						if (Date.now() - lastPingDate.getTime() < 65000) {
							isRecent = true;
						}
					}

					// Если пользователь активен, пуш не ставим в очередь
					if (isOnline && isRecent) {
						continue;
					}
				}
			} catch (err) {
				console.error(
					`❌ [PUSH_QUEUE_ERROR] Ошибка проверки статуса пользователя: ${err.message || err}`,
				);
				// Если ошибка проверки, лучше отправить пуш, чем пропустить
			}

			offlineUserIds.push(uid);
		}

		if (offlineUserIds.length === 0) {
			e.next();
			return;
		}

		// Сбор активных подписок только для offline-пользователей
		const filterQuery = offlineUserIds
			.map((id) => `${DB.FIELDS.USER_ID} = '${id}'`)
			.join(" || ");

		const subscriptions = e.app.findRecordsByFilter(
			DB.TABLES.PUSH_SUBS,
			filterQuery,
			"",
			500,
			0,
			{},
		);

		if (subscriptions.length === 0) {
			e.next();
			return;
		}

		const pushSubs = subscriptions.map((sub) => ({
			endpoint: sub.get(DB.FIELDS.ENDPOINT),
			p256dh: sub.get(DB.FIELDS.P256DH),
			auth: sub.get(DB.FIELDS.AUTH),
		}));

		const payload = {
			type: DB.VALUES.PUSH_TYPE_NEW_MESSAGE,
			roomId: roomId,
			title: senderName,
			body: "Новое сообщение",
		};

		// Сохранение задачи в task_queue
		const taskCollection = e.app.findCollectionByNameOrId(DB.TABLES.TASK_QUEUE);
		const task = new Record(taskCollection, {
			[DB.FIELDS.TASK_KEY]: `push:msg:${message.id}`,
			[DB.FIELDS.TYPE]: DB.VALUES.TASK_TYPE_PUSH,
			[DB.FIELDS.PAYLOAD]: {
				subscriptions: pushSubs,
				data: payload,
			},
			[DB.FIELDS.STATUS]: DB.VALUES.STATUS_PENDING,
			[DB.FIELDS.RUN_AT]: new Date()
				.toISOString()
				.replace("T", " ")
				.split(".")[0],
		});

		e.app.save(task);
	} catch (err) {
		console.error(`❌ [PUSH_QUEUE_ERROR]: ${err}`);
	}
}, "messages");

/**
 * 5. АВТОМАТИЧЕСКИЙ СБРОС ЗАВИСШИХ ЗАДАЧ ПРИ СТАРТЕ
 * Сбрасывает статус всех задач, оставшихся в состоянии 'processing' после перезапуска сервера, обратно в 'pending'.
 */
onBootstrap((e) => {
	e.next();

	const DB = require(`${__hooks}/db.js`);
	try {
		console.log("🧹 [BOOTSTRAP] Проверка и сброс зависших задач в очереди...");

		const result = e.app
			.db()
			.newQuery(
				`UPDATE ${DB.TABLES.TASK_QUEUE} SET ${DB.FIELDS.STATUS} = {:pending} WHERE ${DB.FIELDS.STATUS} = {:processing}`,
			)
			.bind({
				pending: DB.VALUES.STATUS_PENDING,
				processing: DB.VALUES.STATUS_PROCESSING,
			})
			.execute();

		console.log(
			`🧹 [BOOTSTRAP] Очередь задач проверена. Восстановлено задач: ${result.rowsAffected() || 0}`,
		);
	} catch (err) {
		console.error(
			`❌ [BOOTSTRAP_ERROR] Ошибка при автосбросе задач: ${err.message || err}`,
		);
	}
});

/**
 * 6. CRON ЗАДАЧИ
 */

// 6.1. Очистка старых системных сообщений (старше 30 дней) - запускается каждую ночь в 3:00
cronAdd("cleanup_system_messages", "0 3 * * *", () => {
	const DB = require(`${__hooks}/db.js`);
	console.log("🧹 [CRON] Запуск очистки старых системных сообщений...");
	try {
		// В SQLite функции datetime работают с форматом "YYYY-MM-DD HH:MM:SSZ",
		// PocketBase хранит даты именно в таком виде.
		const result = $app
			.db()
			.newQuery(
				`DELETE FROM ${DB.TABLES.MESSAGES}
            WHERE created < datetime('now', '-30 days')
            AND room IN (SELECT id FROM ${DB.TABLES.ROOMS} WHERE type = 'system')`,
			)
			.execute();

		console.log(
			`🧹 [CRON] Удалено старых системных сообщений: ${result.rowsAffected() || 0}`,
		);
	} catch (err) {
		console.error(`❌ [CRON_ERROR] Ошибка очистки: ${err.message || err}`);
	}
});

// 6.2. Фоновая рассылка Broadcast сообщений - запускается каждую минуту
cronAdd("process_broadcasts", "* * * * *", () => {
	const DB = require(`${__hooks}/db.js`);
	try {
		const tasks = $app.findRecordsByFilter(
			DB.TABLES.TASK_QUEUE,
			`type = '${DB.VALUES.TASK_TYPE_BROADCAST}' && status = '${DB.VALUES.STATUS_PENDING}'`,
			"",
			10, // берем пачками
			0,
		);

		if (tasks.length === 0) {
			return;
		}

		for (const task of tasks) {
			task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_PROCESSING);
			$app.save(task);

			try {
				const payload = task.get(DB.FIELDS.PAYLOAD);
				const text = payload.text;
				const adminId = payload.adminId;
				const attachments = payload.attachments || [];
				const broadcastId = task.getString(DB.FIELDS.TASK_KEY);

				// Находим все системные комнаты пользователей
				const sysRooms = $app.findRecordsByFilter(
					DB.TABLES.ROOMS,
					`type = 'system'`,
					"",
					100000,
					0,
				);

				const messageCollection = $app.findCollectionByNameOrId(
					DB.TABLES.MESSAGES,
				);
				let successCount = 0;

				for (const room of sysRooms) {
					const msg = new Record(messageCollection, {
						content: text,
						room: room.id,
						sender: adminId,
						type: "system",
						attachments: attachments,
						metadata: { broadcast_id: broadcastId },
					});

					try {
						$app.saveNoValidate(msg);
						successCount++;
					} catch (e) {
						// Игнорируем ошибку конкретного сообщения
						console.error(
							`❌ [BROADCAST_ERROR] Ошибка отправки в комнату ${room.id}: ${e.message || e}`,
						);
					}
				}

				console.log(
					`📣 [BROADCAST] Успешно отправлено ${successCount} сообщений (Task ID: ${task.id})`,
				);

				task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_COMPLETED);
				$app.save(task);
			} catch (innerErr) {
				console.error(
					`❌ [BROADCAST_ERROR] Ошибка выполнения задачи: ${innerErr.message || innerErr}`,
				);
				task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_FAILED);
				task.set(DB.FIELDS.LAST_ERROR, String(innerErr.message || innerErr));
				$app.save(task);
			}
		}
	} catch (err) {
		console.error(`❌ [BROADCAST_ERROR] Общая ошибка: ${err.message || err}`);
	}
});

/**
 * 7. КАСТОМНЫЕ ЭНДПОИНТЫ ДЛЯ ПОИСКА КОНТАКТОВ (АНАЛОГ TELEGRAM)
 * Позволяет получать список контактов и искать пользователей по username,
 * не открывая глобальный listRule для всех.
 *
 * Все роуты защищены middleware $apis.requireAuth(), который автоматически
 * проверяет JWT-токен из заголовка Authorization и заполняет e.auth.
 * Документация: https://pocketbase.io/docs/js-routing/#retrieving-the-current-auth-state
 */

/**
 * POST /api/custom/broadcast
 * Эндпоинт для отправки Broadcast-сообщений администратором.
 */
routerAdd(
	"POST",
	"/api/custom/broadcast",
	(e) => {
		const DB = require(`${__hooks}/db.js`);
		const user = e.auth;

		const isAdmin = user.get("role") === "admin";
		if (!isAdmin) {
			return e.json(403, { message: "Forbidden: Admins only" });
		}

		const info = e.requestInfo();
		const text = info?.body?.text || "";
		const attachments = info?.body?.attachments || [];

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
		task.set(DB.FIELDS.PAYLOAD, { text: text, attachments: attachments, adminId: user.id });
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
		const user = e.auth;

		if (user.get("role") !== "admin") {
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

			const items = records.map((r) => ({
				id: r.id,
				task_key: r.getString(DB.FIELDS.TASK_KEY),
				type: r.getString(DB.FIELDS.TYPE),
				status: r.getString(DB.FIELDS.STATUS),
				payload: r.get(DB.FIELDS.PAYLOAD),
				created: r.created,
				updated: r.updated,
			}));

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
 * DELETE /api/custom/broadcast/:id
 * Эндпоинт для отзыва (жесткого удаления) Broadcast-сообщения администратором.
 */
routerAdd(
	"DELETE",
	"/api/custom/broadcast/:id",
	(e) => {
		const DB = require(`${__hooks}/db.js`);
		const user = e.auth;

		if (user.get("role") !== "admin") {
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
				`metadata~'"broadcast_id":"${broadcastId}"'`,
				"",
				100000,
				0,
			);

			for (const msg of messages) {
				$app.delete(msg);
			}

			// Находим саму задачу
			const tasks = $app.findRecordsByFilter(
				DB.TABLES.TASK_QUEUE,
				`task_key = '${broadcastId}'`,
				"",
				1,
				0,
			);
			
			if (tasks.length > 0) {
				const task = tasks[0];
				const payload = task.get(DB.FIELDS.PAYLOAD) || {};
				const attachments = payload.attachments || [];

				$app.delete(task);

				// Пытаемся удалить вложения
				for (const mediaId of attachments) {
					try {
						const mediaRecord = $app.findRecordById("media", mediaId);
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
 * GET /api/custom/users/contacts
 * Возвращает список пользователей, с которыми текущий юзер имеет общие комнаты.
 */
routerAdd("GET", "/api/custom/users/contacts", (e) => {
	const userId = e.auth.id;

	try {
		const myMembers = $app.findRecordsByFilter(
			"room_members",
			`user = '${userId}'`,
			"",
			500,
			0,
		);
		if (myMembers.length === 0) {
			return e.json(200, []);
		}
		const roomIds = myMembers.map((m) => m.get("room"));

		const filter = roomIds.map((id) => `room = '${id}'`).join(" || ");
		const otherMembers = $app.findRecordsByFilter(
			"room_members",
			`user != '${userId}' && (${filter})`,
			"",
			500,
			0,
		);
		const otherUserIds = [...new Set(otherMembers.map((m) => m.get("user")))];

		if (otherUserIds.length === 0) {
			return e.json(200, []);
		}

		const usersFilter = otherUserIds.map((id) => `id = '${id}'`).join(" || ");
		const users = $app.findRecordsByFilter("users", usersFilter, "", 500, 0);

		const result = users.map((u) => ({
			id: u.id,
			username: u.get("username"),
			display_name: u.get("display_name"),
			avatar: u.get("avatar"),
			status: u.get("status"),
			last_seen: u.get("last_seen"),
			role: u.get("role"),
		}));

		return e.json(200, result);
	} catch (err) {
		console.error("❌ [CONTACTS] Ошибка:", err);
		return e.json(200, []);
	}
}, $apis.requireAuth());

/**
 * GET /api/custom/users/search?q=...
 * Поиск пользователей по username или display_name.
 */
routerAdd("GET", "/api/custom/users/search", (e) => {
	const q = e.request.url.query().get("q") || "";
	if (!q) {
		return e.json(200, []);
	}

	try {
		const filter = `username ~ '${q}' || display_name ~ '${q}'`;
		const users = $app.findRecordsByFilter("users", filter, "-created", 50, 0);

		return e.json(
			200,
			users.map((u) => u.publicExport()),
		);
	} catch (err) {
		console.error("❌ [SEARCH] Ошибка:", err);
		return e.json(500, { message: "Internal Server Error" });
	}
}, $apis.requireAuth());

/**
 * POST /api/custom/invites/generate
 * Генерация инвайт-кода с rate limiting (админы без ограничений).
 */
routerAdd("POST", "/api/custom/invites/generate", (e) => {
	const DB = require(`${__hooks}/db.js`);
	const user = e.auth;

	// Проверка лимитов (Rate Limiting) — админы без ограничений
	const isAdmin = user.get("role") === "admin";

	if (!isAdmin) {
		const pastTime = new Date(Date.now() - DB.CONFIG.INVITE_RATE_LIMIT_MINUTES * 60000)
			.toISOString()
			.replace("T", " ");

		const recentInvites = $app.findRecordsByFilter(
			"invites",
			`created_by = '${user.id}' && created >= '${pastTime}'`,
			"",
			1,
			0,
		);

		if (recentInvites.length > 0) {
			return e.json(429, { message: `Rate limit: Only 1 invite allowed per ${DB.CONFIG.INVITE_RATE_LIMIT_MINUTES} minute(s)` });
		}
	}

	// Генерация инвайт-кода
	const inviteCollection = $app.findCollectionByNameOrId("invites");
	const record = new Record(inviteCollection);
	const code = `kk-${$security.randomString(8)}`;
	record.set("code", code);
	record.set("created_by", user.id);
	record.set("status", "active");

	$app.save(record);

	return e.json(200, { code: code });
}, $apis.requireAuth());
