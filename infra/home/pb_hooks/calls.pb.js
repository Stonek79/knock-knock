/**
 * @module CallsHooks
 * @description КНОК-КНОК: Эндпоинты для звонков (LiveKit)
 *
 * Файл содержит логику создания и управления токенами для WebRTC звонков,
 * проверки прав участников и уведомления других пользователей о звонке.
 */

const DB = require(`${__hooks}/db.js`);

routerAdd("POST", "/api/calls/token", (c) => {
	const info = $apis.requestInfo(c);
	const body = info.data || info.body || {};
	const room_id = body.room_id;
	const call_type = body.call_type || DB.VALUES.CALL_TYPE_VIDEO;

	if (!room_id) {
		return c.json(400, { error: "room_id обязателен" });
	}

	const authRecord = c.get("authRecord");
	if (!authRecord) {
		return c.json(401, { error: "Не авторизован" });
	}
	const userId = authRecord.id;

	// 1. Проверяем, является ли пользователь участником комнаты
	let isMember = false;
	try {
		const members = $app.findRecordsByFilter(
			DB.TABLES.MEMBERS,
			`room = {:roomId} && user = {:userId}`,
			"",
			1,
			0,
			{ roomId: room_id, userId: userId },
		);
		if (members.length > 0) {
			isMember = true;
		}
	} catch (err) {
		console.error(
			`❌ [CALLS_ERROR] Ошибка проверки участника: ${err.message || err}`,
		);
		return c.json(500, { error: "Внутренняя ошибка сервера" });
	}

	if (!isMember) {
		return c.json(403, { error: "Нет доступа к этой комнате" });
	}

	// 2. Анонимизированный идентификатор участника (Zero-Knowledge)
	// Не передаем открытый userId в LiveKit token
	const anonIdentity = `anon_${$security.md5(`${userId}_${room_id}`)}`;

	// 3. Запрашиваем токен у push-шлюза
	let token = "";
	try {
		const envGateway = $os.getenv("PB_PUSH_GATEWAY_URL");
		const baseUrl = envGateway
			? envGateway.replace(/\/push\/?$/, "")
			: "http://whoami-push:4000";
		const tokenUrl = `${baseUrl}/api/livekit-token`;

		const res = $http.send({
			url: tokenUrl,
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				roomName: room_id,
				participantIdentity: anonIdentity,
			}),
			timeout: 5,
		});

		if (res.statusCode >= 200 && res.statusCode < 300) {
			const data = res.json;
			token = data.token;
		} else {
			console.error(
				`❌ [CALLS_ERROR] Push-шлюз вернул ошибку: ${res.statusCode} ${res.raw}`,
			);
			return c.json(500, { error: "Не удалось получить токен" });
		}
	} catch (err) {
		console.error(
			`❌ [CALLS_ERROR] Ошибка запроса токена: ${err.message || err}`,
		);
		return c.json(500, { error: "Ошибка соединения с сервисом звонков" });
	}

	// 4. Логи звонков без раскрытия участников в открытых полях (ZK metadata)
	let callLogId = null;
	try {
		const callsCollection = $app.findCollectionByNameOrId(
			DB.TABLES.CALL_LOGS,
		);
		const callRecord = new Record(callsCollection, {
			room: room_id,
			initiator: userId,
			type: call_type,
			status: DB.VALUES.CALL_STATUS_RINGING,
			encrypted_metadata: JSON.stringify({
				type: "call_init",
				created_at: new Date().toISOString(),
			}),
		});
		$app.save(callRecord);
		callLogId = callRecord.id;
		console.log(`📞 [CALLS_DEBUG] Создан лог звонка: ${callLogId}`);
	} catch (err) {
		console.error(
			`❌ [CALLS_ERROR] Не удалось создать запись call_logs: ${err.message || err}`,
		);
	}

	// 5. Отправка Push-уведомлений о звонке через очередь задач (Blind Push)
	try {
		const members = $app.findRecordsByFilter(
			DB.TABLES.MEMBERS,
			`room = {:roomId} && user != {:userId}`,
			"",
			100,
			0,
			{ roomId: room_id, userId: userId },
		);

		const otherUserIds = members.map((m) => m.get("user"));

		if (otherUserIds.length > 0) {
			const subsFilter = otherUserIds
				.map((id) => `user = '${id}'`)
				.join(" || ");
			const subscriptions = $app.findRecordsByFilter(
				DB.TABLES.PUSH_SUBS,
				subsFilter,
				"",
				500,
				0,
			);

			if (subscriptions.length > 0) {
				const subsData = subscriptions.map((sub) => {
					return {
						endpoint: sub.get("endpoint"),
						keys: {
							p256dh: sub.get("p256dh"),
							auth: sub.get("auth"),
						},
					};
				});

				const payload = {
					data: {
						type: "call_incoming",
						roomId: room_id,
						callLogId: callLogId,
						callType: call_type,
					},
					subscriptions: subsData,
				};

				const taskQueueCollection = $app.findCollectionByNameOrId(
					DB.TABLES.TASK_QUEUE,
				);
				const taskRecord = new Record(taskQueueCollection, {
					task_key: `call_${Date.now()}_${room_id}`,
					payload: JSON.stringify(payload),
					status: DB.VALUES.STATUS_PENDING,
					attempts: 0,
					run_at: new Date().toISOString(),
				});
				$app.save(taskRecord);
				console.log(
					`📞 [CALLS_DEBUG] Создана задача на Push-уведомление для ${subscriptions.length} устройств.`,
				);
			}
		}
	} catch (err) {
		console.error(
			`❌ [CALLS_ERROR] Ошибка планирования Push-уведомлений о звонке: ${err.message || err}`,
		);
	}

	return c.json(200, { token: token });
});
