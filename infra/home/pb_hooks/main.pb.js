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

	// Генерация детерминированного ID для комнаты на основе ID пользователя
	const rawHash = $security.md5(`"${DB.VALUES.PREFIX_SELF_CHAT}" ${user.id}`);
	const deterministicId = rawHash.slice(0, 15);

	try {
		$app.runInTransaction((tx) => {
			let roomExists = false;
			try {
				tx.findRecordById(DB.TABLES.ROOMS, deterministicId);
				roomExists = true;
			} catch (_findErr) {
				// Запись не найдена — продолжаем создание
			}

			if (roomExists) {
				return;
			}

			const roomCollection = tx.findCollectionByNameOrId(DB.TABLES.ROOMS);
			const memberCollection = tx.findCollectionByNameOrId(DB.TABLES.MEMBERS);

			// Создание комнаты
			const room = new Record(roomCollection, {
				[DB.FIELDS.ID]: deterministicId,
				[DB.FIELDS.TYPE]: DB.VALUES.ROOM_TYPE_DIRECT,
				[DB.FIELDS.NAME]: DB.VALUES.FAVORITES_NAME,
				[DB.FIELDS.VISIBILITY]: DB.VALUES.VISIBILITY_PRIVATE,
				[DB.FIELDS.CREATED_BY]: user.id,
			});
			tx.saveNoValidate(room);

			// Добавление единственного участника (себя)
			const member = new Record(memberCollection, {
				[DB.FIELDS.ROOM]: room.id,
				[DB.FIELDS.USER]: user.id,
				[DB.FIELDS.ROLE]: DB.VALUES.ROLE_OWNER,
				[DB.FIELDS.UNREAD_COUNT]: 0,
			});
			tx.saveNoValidate(member);

			console.log(`⭐ [REG] Создано Избранное для: ${user.email()}`);
		});
	} catch (err) {
		console.error(`❌ [REG_ERROR]: ${err.message || err}`);
	}
}, "users");

/**
 * 2. КАШКАДНОЕ УДАЛЕНИЕ ДАННЫХ
 * Удаляет связанные файлы и личные чаты при удалении пользователя.
 */
onRecordAfterDeleteSuccess((e) => {
	const DB = require(`${__hooks}/db.js`);
	const user = e.record;

	// Удаление медиафайлов
	try {
		const mediaRecords = $app.findRecordsByFilter(
			DB.TABLES.MEDIA,
			`${DB.FIELDS.CREATED_BY} = {:uid}`,
			"-created",
			500,
			0,
			{ uid: user.id },
		);
		for (const rec of mediaRecords) {
			$app.deleteNoValidate(rec);
		}
	} catch (err) {
		console.error(`❌ [CLEANUP_ERROR] Медиа: ${err}`);
	}

	// Удаление личных диалогов
	try {
		const memberRecords = $app.findRecordsByFilter(
			DB.TABLES.MEMBERS,
			`${DB.FIELDS.USER} = {:uid}`,
			"-created",
			1000,
			0,
			{ uid: user.id },
		);

		for (const member of memberRecords) {
			const roomId = member.get(DB.FIELDS.ROOM);
			const room = $app.findRecordById(DB.TABLES.ROOMS, roomId);

			if (room && room.get(DB.FIELDS.TYPE) === DB.VALUES.ROOM_TYPE_DIRECT) {
				$app.deleteNoValidate(room);
				console.log(`🗑️ [CLEANUP] Удален личный чат: ${room.id}`);
			}
		}
	} catch (err) {
		console.error(`❌ [CLEANUP_ERROR] Комнаты: ${err}`);
	}
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
		if (startTimeStr && Date.now() - start < 3000) {
			throw $errors.badRequest("Bot detected (too fast)");
		}
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
		return;
	}

	try {
		const roomId = message.get(DB.FIELDS.ROOM);
		const senderId = message.get(DB.FIELDS.SENDER);

		// Поиск получателей уведомления
		const members = $app.findRecordsByFilter(
			DB.TABLES.MEMBERS,
			`${DB.FIELDS.ROOM} = {:roomId} && ${DB.FIELDS.USER} != {:senderId}`,
			"",
			100,
			0,
			{ roomId: roomId, senderId: senderId },
		);

		if (members.length === 0) {
			return;
		}

		const userIds = members.map((m) => m.get(DB.FIELDS.USER));

		// Сбор активных подписок
		const filterQuery = userIds
			.map((id) => `${DB.FIELDS.USER_ID} = '${id}'`)
			.join(" || ");

		const subscriptions = $app.findRecordsByFilter(
			DB.TABLES.PUSH_SUBS,
			filterQuery,
			"",
			500,
			0,
			{},
		);

		if (subscriptions.length === 0) {
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
		};

		// Сохранение задачи в task_queue
		const taskCollection = $app
			.dao()
			.findCollectionByNameOrId(DB.TABLES.TASK_QUEUE);
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

		$app.dao().saveRecord(task);
	} catch (err) {
		console.error(`❌ [PUSH_QUEUE_ERROR]: ${err}`);
	}
}, "messages");
