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
 * 6. КАСТОМНЫЕ ЭНДПОИНТЫ ДЛЯ ПОИСКА КОНТАКТОВ (АНАЛОГ TELEGRAM)
 * Позволяет получать список контактов и искать пользователей по username,
 * не открывая глобальный listRule для всех.
 */

// Универсальная функция для получения пользователя из контекста (для PB v0.22 и v0.23)
function getAuthRecord(c) {
	try {
		// PB v0.23+
		if (c.auth) {
			return c.auth;
		}
		
		// PB v0.22 (принудительный парсинг токена из заголовков)
		if (typeof $apis !== "undefined" && typeof $apis.requestInfo === "function") {
			const info = $apis.requestInfo(c);
			if (info && (info.authRecord || info.admin || info.auth)) {
				return info.authRecord || info.admin || info.auth;
			}
		}

		// Fallback PB v0.22
		if (typeof c.get === "function") {
			return c.get("authRecord") || c.get("admin");
		}
	} catch (e) {
		console.log("Error extracting authRecord:", e);
	}
	return null;
}

routerAdd("GET", "/api/custom/users/contacts", (c) => {
	const authRecord = getAuthRecord(c);
	if (!authRecord) {
		console.log("❌ [CONTACTS] authRecord is null. Headers:", typeof c.request?.header === 'function' ? c.request.header() : "unknown");
		return c.json(403, { message: "Guest access not allowed" });
	}
	const userId = authRecord.id;

	try {
		const myMembers = $app.findRecordsByFilter(
			"room_members",
			`user = '${userId}'`,
		);
		if (myMembers.length === 0) {
			return c.json(200, []);
		}
		const roomIds = myMembers.map((m) => m.get("room"));

		const filter = roomIds.map((id) => `room = '${id}'`).join(" || ");
		const otherMembers = $app.findRecordsByFilter(
			"room_members",
			`user != '${userId}' && (${filter})`,
		);
		const otherUserIds = [...new Set(otherMembers.map((m) => m.get("user")))];

		if (otherUserIds.length === 0) {
			return c.json(200, []);
		}

		const usersFilter = otherUserIds.map((id) => `id = '${id}'`).join(" || ");
		const users = $app.findRecordsByFilter("users", usersFilter);

		const result = users.map((u) => ({
			id: u.id,
			username: u.get("username"),
			display_name: u.get("display_name"),
			avatar: u.get("avatar"),
			status: u.get("status"),
			last_seen: u.get("last_seen"),
			role: u.get("role"),
		}));

		return c.json(200, result);
	} catch (e) {
		console.error("Contacts error:", e);
		return c.json(200, []);
	}
});

routerAdd("GET", "/api/custom/users/search", (c) => {
	const authRecord = getAuthRecord(c);
	if (!authRecord) {
		return c.json(403, { message: "Guest access not allowed" });
	}
	const q = c.queryParam("q") || "";
	if (!q) {
		return c.json(200, []);
	}

	try {
		const filter = `username ~ '${q}' || display_name ~ '${q}'`;
		const users = $app.findRecordsByFilter("users", filter, "-created", 50, 0);

		return c.json(
			200,
			users.map((u) => u.publicExport()),
		);
	} catch (err) {
		console.error("❌ [API_USERS_SEARCH] Error:", err);
		throw new ApiError(500, "Internal Server Error");
	}
});

/**
 * ГЕНЕРАЦИЯ ИНВАЙТА С RATE LIMITING
 */
routerAdd("POST", "/api/custom/invites/generate", (c) => {
	const DB = require(`${__hooks}/db.js`);
	const user = getAuthRecord(c);
	if (!user) {
		console.log("❌ [INVITES] user is null");
		throw new ApiError(401, "Unauthorized");
	}

	// 2. Проверка лимитов (Rate Limiting) (админы без ограничений)
	if (user.get("role") !== "admin") {
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
			throw new ApiError(
				429,
				`Rate limit: Only 1 invite allowed per ${DB.CONFIG.INVITE_RATE_LIMIT_MINUTES} minute(s)`,
			);
		}
	}

	// Генерация
	const inviteCollection = $app.findCollectionByNameOrId("invites");
	const record = new Record(inviteCollection);
	const code = `kk-${$security.randomString(8)}`;
	record.set("code", code);
	record.set("created_by", user.id);
	record.set("status", "active");

	$app.save(record);

	return c.json(200, { code: code });
});
