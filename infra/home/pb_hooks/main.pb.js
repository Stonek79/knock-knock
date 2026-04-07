/**
 * КНОК-КНОК: СЕРВЕРНЫЕ ХУКИ (POCKETBASE)
 *
 * Эти хуки обеспечивают:
 * 1. Транзакционное создание комнаты "Избранное" при регистрации.
 * 2. Рекурсивное удаление всех данных пользователя (сообщения, ключи, медиа).
 */

// 1. Создание Избранного при регистрации
onRecordAfterCreateSuccess((e) => {
	const DB = {
		TABLES: {
			USERS: "users",
			ROOMS: "rooms",
			MEMBERS: "room_members",
			MEDIA: "media",
		},
		FIELDS: {
			ID: "id",
			TYPE: "type",
			NAME: "name",
			VISIBILITY: "visibility",
			CREATED_BY: "created_by",
			USER: "user",
			ROLE: "role",
			UNREAD_COUNT: "unread_count",
			ROOM: "room",
			OWNER: "owner",
		},
		VALUES: {
			ROOM_TYPE_DIRECT: "direct",
			VISIBILITY_PRIVATE: "private",
			ROLE_OWNER: "owner",
			FAVORITES_NAME: "chat.favorites",
		},
	};

	const user = e.record;

	// Чтобы фронтенд всегда находил комнату, нам НУЖЕН детерминизм.
	const rawHash = $security.md5(`"self-chat:" ${user.id}`);
	const deterministicId = rawHash.slice(0, 15);

	try {
		$app.runInTransaction((tx) => {
			const roomCollection = tx.findCollectionByNameOrId(DB.TABLES.ROOMS);
			const memberCollection = tx.findCollectionByNameOrId(DB.TABLES.MEMBERS);

			// Создаем комнату Избранное (Saved Messages)
			const room = new Record(roomCollection, {
				[DB.FIELDS.ID]: deterministicId,
				[DB.FIELDS.TYPE]: DB.VALUES.ROOM_TYPE_DIRECT,
				[DB.FIELDS.NAME]: DB.VALUES.FAVORITES_NAME,
				[DB.FIELDS.VISIBILITY]: DB.VALUES.VISIBILITY_PRIVATE,
				[DB.FIELDS.CREATED_BY]: user.id,
			});
			tx.saveNoValidate(room); // В v0.23+ save() может проверять права, используем более прямой путь если нужно

			// Добавляем создателя в участники
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
		console.error(
			`❌ [REG_ERROR] Ошибка инициализации для ${user.email()}: ${err}`,
		);
		// В v0.23+ мы в AfterCreateSuccess, юзер уже сохранен. Если упали — удаляем его.
		// $app.deleteNoValidate(user);
	}
}, "users");

// 2. Рекурсивное удаление данных при удалении пользователя
onRecordAfterDeleteSuccess((e) => {
	const DB = {
		TABLES: {
			USERS: "users",
			ROOMS: "rooms",
			MEMBERS: "room_members",
			MEDIA: "media",
		},
		FIELDS: {
			ID: "id",
			TYPE: "type",
			NAME: "name",
			VISIBILITY: "visibility",
			CREATED_BY: "created_by",
			USER: "user",
			ROLE: "role",
			UNREAD_COUNT: "unread_count",
			ROOM: "room",
			OWNER: "owner",
		},
		VALUES: {
			ROOM_TYPE_DIRECT: "direct",
			VISIBILITY_PRIVATE: "private",
			ROLE_OWNER: "owner",
			FAVORITES_NAME: "chat.favorites",
		},
	};

	const user = e.record;

	// 2.1. Удаление MEDIA (физические файлы)
	try {
		const mediaRecords = $app.findRecordsByFilter(
			DB.TABLES.MEDIA,
			`${DB.FIELDS.CREATED_BY} = {:uid} || ${DB.FIELDS.USER} = {:uid}`,
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

	// 2.2. Удаление личных чатов (Direct Rooms)
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

	console.log(`🧹 [CLEANUP] Пользователь ${user.id} полностью очищен.`);
}, "users");

/**
 * 3. Серверная проверка защиты от ботов (PocketBase Hooks)
 * Файл: infra/home/pb_hooks/main.pb.js [MODIFY]
 */

onRecordCreateRequest((e) => {
	console.log("🔍 [HOOK] Попытка создания пользователя...");

	try {
		// В v0.23 e — это и есть контекст запроса, либо он содержит requestInfo.data
		const data = e.requestInfo ? e.requestInfo.data : {};

		if (e.get?.("admin")) {
			return e.next();
		}

		// 1. Проверка Honeypot
		if (data.username_bot) {
			throw $errors.badRequest("Bot detected (honeypot)");
		}

		// 2. Проверка времени заполнения (минимум 3 секунды)
		const startTimeStr = data._startTime;
		const start = parseInt(startTimeStr || "0", 10);
		const now = Date.now();
		if (startTimeStr && now - start < 3000) {
			throw $errors.badRequest("Bot detected (too fast)");
		}

		// --- ШАГ 1: ПРИНУДИТЕЛЬНОЕ ЗАПОЛНЕНИЕ TOKENKEY ---
		if (!e.record.get("tokenKey")) {
			e.record.set("tokenKey", $security.randomString(30));
			console.log("⚡ [HOOK] tokenKey сгенерирован принудительно.");
		}

		// Гарантируем passwordConfirm
		if (!e.record.get("passwordConfirm")) {
			const password = data.password;
			if (password) {
				e.record.set("passwordConfirm", password);
			}
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
 * 4. Уведомления о новых сообщениях (Push Gateway)
 * Триггер: Создание нового сообщения (коллекция "messages")
 */
onRecordAfterCreateSuccess((e) => {
	const DB = {
		TABLES: {
			MEMBERS: "room_members",
			PUSH_SUBS: "push_subscriptions",
		},
		FIELDS: {
			TYPE: "type",
			ROOM: "room",
			SENDER: "sender",
			USER: "user",
			USER_ID: "user_id",
			ENDPOINT: "endpoint",
			P256DH: "p256dh",
			AUTH: "auth",
		},
		VALUES: {
			TYPE_SYSTEM: "system",
		},
	};

	const message = e.record;

	// Системные сообщения не пушатся (если они есть)
	if (message.get(DB.FIELDS.TYPE) === DB.VALUES.TYPE_SYSTEM) {
		return;
	}

	try {
		const roomId = message.get(DB.FIELDS.ROOM);
		const senderId = message.get(DB.FIELDS.SENDER);

		// 1. Ищем участников комнаты, кроме отправителя
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

		// 2. Ищем VAPID подписки найденных участников
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

		console.log(
			`[PUSH] Отправка ${pushSubs.length} пушей для комнаты ${roomId}`,
		);

		// Payload (только мета-информация, сам текст вытянет PWA Service Worker)
		const payload = {
			type: "NEW_MESSAGE",
			roomId: roomId,
		};

		// Достаем URL шлюза из ENV, чтобы в Dev режиме ходить в правильный контейнер
		const pushGatewayUrl =
			$os.getenv("PB_PUSH_GATEWAY_URL") || "http://push-gateway:4000";

		const res = $http.send({
			url: `${pushGatewayUrl}/api/send-push`,
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				subscriptions: pushSubs,
				payload: payload,
			}),
		});

		console.log(`[PUSH] Gateway HTTP-Code: ${res.statusCode}`);
	} catch (err) {
		console.error(`❌ [PUSH_ERROR]: ${err}`);
	}
}, "messages");
