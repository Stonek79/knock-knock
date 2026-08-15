// Модуль получен при разбиении hooks-монолита: соответствует блоку
// из main.pb.js с сохранением порядка регистраций и поведения.
// message delivery: постановка push-задач при создании сообщения.
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

		// Имя отправителя и текст больше не извлекаются (Blind Push)

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
		const subscriptionParams = Object.fromEntries(
			offlineUserIds.map((id, index) => [`offlineUser${index}`, id]),
		);
		const filterQuery = offlineUserIds
			.map((_, index) => `${DB.FIELDS.USER_ID} = {:offlineUser${index}}`)
			.join(" || ");

		const subscriptions = e.app.findRecordsByFilter(
			DB.TABLES.PUSH_SUBS,
			filterQuery,
			"",
			500,
			0,
			subscriptionParams,
		);

		if (subscriptions.length === 0) {
			e.next();
			return;
		}

		const pushSubs = subscriptions.map((sub) => ({
			id: sub.id,
			endpoint: sub.get(DB.FIELDS.ENDPOINT),
			keys: {
				p256dh: sub.get(DB.FIELDS.P256DH),
				auth: sub.get(DB.FIELDS.AUTH),
			},
		}));

		const payload = {
			type: DB.VALUES.PUSH_TYPE_NEW_MESSAGE,
			roomId: roomId,
			content: message.get(DB.FIELDS.CONTENT),
			iv: message.get(DB.FIELDS.IV),
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
