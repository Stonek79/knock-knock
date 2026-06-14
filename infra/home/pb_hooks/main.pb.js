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

	console.log(`🚀 [REG_DEBUG] Начало инициализации Избранного для пользователя: ${user.email()} (ID: ${user.id})`);

	// Генерация детерминированного ID для комнаты на основе ID пользователя
	const rawHash = $security.md5(`"${DB.VALUES.PREFIX_SELF_CHAT}" ${user.id}`);
	const deterministicId = rawHash.slice(0, 15);

	console.log(`🔍 [REG_DEBUG] Сгенерированный ID комнаты Избранного: ${deterministicId}`);

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
		console.error(`❌ [REG_DEBUG_ERROR] Ошибка при проверке существования комнаты: ${filterErr.message || filterErr}`);
	}

	if (rooms.length > 0) {
		console.log(`ℹ️ [REG_DEBUG] Избранное уже существует для пользователя: ${user.email()} (Room ID: ${deterministicId}). Создание не требуется.`);
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

		console.log(`⭐ [REG] Избранное успешно создано и записано для: ${user.email()}`);
	} catch (err) {
		console.error(`❌ [REG_ERROR] Ошибка при создании Избранного: ${err.message || err}`);
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
		e.next();
		return;
	}

	try {
		const roomId = message.get(DB.FIELDS.ROOM);
		const senderId = message.get(DB.FIELDS.SENDER);

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

		// Сбор активных подписок
		const filterQuery = userIds
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

		const rowsAffected = result.rowsAffected() || 0;
		console.log(`🧹 [BOOTSTRAP] Очередь задач проверена. Восстановлено задач: ${rowsAffected}`);
	} catch (err) {
		console.error(`❌ [BOOTSTRAP_ERROR] Ошибка при автосбросе задач: ${err.message || err}`);
	}
});

