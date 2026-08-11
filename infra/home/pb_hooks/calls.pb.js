/**
 * @module CallsHooks
 * @description КНОК-КНОК: Эндпоинты для звонков (LiveKit)
 *
 * Файл содержит логику создания и управления токенами для WebRTC звонков,
 * проверки прав участников, обновления статусов и уведомления других пользователей.
 */

routerAdd("POST", "/api/calls/token", (e) => {
	const DB = require(`${__hooks}/db.js`);
	const info = e.requestInfo();
	const body = info.body || {};
	const room_id = body.room_id;
	const call_type = body.call_type || DB.VALUES.CALL_TYPE_VIDEO;
	const is_join = body.is_join === true || body.is_accept === true;
	const existing_call_log_id = body.call_log_id;

	if (!room_id) {
		return e.json(400, {
			code: "INVALID_REQUEST",
			error: "room_id обязателен",
		});
	}

	const authRecord = e.auth;
	if (!authRecord) {
		return e.json(401, { code: "UNAUTHORIZED", error: "Не авторизован" });
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
	} catch (_err) {
		console.error("❌ [CALLS_ERROR] Ошибка проверки участника");
		return e.json(500, {
			code: "INTERNAL_ERROR",
			error: "Внутренняя ошибка сервера",
		});
	}

	if (!isMember) {
		return e.json(403, {
			code: "ROOM_ACCESS_DENIED",
			error: "Нет доступа к этой комнате",
		});
	}

	// 2. Анонимизированный идентификатор участника (Zero-Knowledge)
	const anonIdentity = `anon_${$security.md5(`${userId}_${room_id}`)}`;

	// 3. Запрашиваем токен у push-шлюза (server-to-server)
	let token = "";
	try {
		const gatewaySecret = $os.getenv("PUSH_GATEWAY_SECRET") || "";
		if (!gatewaySecret) {
			console.error("PUSH_GATEWAY_SECRET is not configured");
			return e.json(500, {
				code: "CALL_SERVICE_DOWN",
				error: "Push gateway secret is not configured",
			});
		}

		const envGateway = $os.getenv("PB_PUSH_GATEWAY_URL");
		const baseUrl = envGateway
			? envGateway.replace(/\/+$/, "")
			: "http://whoami-push:4000";
		const tokenUrl = `${baseUrl}/api/livekit-token`;

		const res = $http.send({
			url: tokenUrl,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${gatewaySecret}`,
			},
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
				`❌ [CALLS_ERROR] Push-шлюз вернул ошибку: статус ${res.statusCode}`,
			);
			return e.json(500, {
				code: "CALL_SERVICE_DOWN",
				error: "Не удалось получить токен звонка",
			});
		}
	} catch (_err) {
		console.error("❌ [CALLS_ERROR] Ошибка запроса токена");
		return e.json(500, {
			code: "CALL_SERVICE_DOWN",
			error: "Не удалось получить токен звонка",
		});
	}

	//Если пользователь присоединяется/отвечает на звонок — не создаем новый лог и не слаем пуши
	if (is_join) {
		if (existing_call_log_id) {
			try {
				const callRecord = $app.findRecordById(
					DB.TABLES.CALL_LOGS,
					existing_call_log_id,
				);
				if (callRecord) {
					callRecord.set("status", DB.VALUES.CALL_STATUS_ONGOING);
					$app.save(callRecord);
					console.log(
						`📞 [CALLS_DEBUG] Звонок ${existing_call_log_id} переведен в статус ongoing`,
					);
				}
			} catch (_err) {
				console.error(
					"❌ [CALLS_ERROR] Ошибка обновления статуса лога звонка",
				);
			}
		}
		return e.json(200, { token: token, callLogId: existing_call_log_id });
	}

	// 4. Логи инициации звонка (только при создании нового звонка)
	let callLogId = null;
	try {
		const callsCollection = $app.findCollectionByNameOrId(DB.TABLES.CALL_LOGS);
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
		console.log(`📞 [CALLS_DEBUG] Создан новый лог звонка: ${callLogId}`);
	} catch (_err) {
		console.error("❌ [CALLS_ERROR] Не удалось создать запись call_logs");
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
				.map((id) => `${DB.FIELDS.USER_ID} = '${id}'`)
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
						id: sub.id,
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
	} catch (_err) {
		console.error(
			"❌ [CALLS_ERROR] Ошибка планирования Push-уведомлений о звонке",
		);
	}

	return e.json(200, { token: token, callLogId: callLogId });
});

/**
 * Серверный эндпоинт безопасного обновления статуса вызова от имени суперпользователя
 */
routerAdd("POST", "/api/calls/status", (e) => {
	const DB = require(`${__hooks}/db.js`);
	const info = e.requestInfo();
	const body = info.body || {};
	const call_log_id = body.call_log_id;
	const status = body.status;

	if (!call_log_id || !status) {
		return e.json(400, {
			code: "INVALID_REQUEST",
			error: "call_log_id и status обязательны",
		});
	}

	const authRecord = e.auth;
	if (!authRecord) {
		return e.json(401, { code: "UNAUTHORIZED", error: "Не авторизован" });
	}

	try {
		const callRecord = $app.findRecordById(DB.TABLES.CALL_LOGS, call_log_id);
		if (!callRecord) {
			return e.json(404, { code: "NOT_FOUND", error: "Лог звонка не найден" });
		}

		callRecord.set("status", status);
		$app.save(callRecord);
		console.log(
			`📞 [CALLS_DEBUG] Статус звонка ${call_log_id} успешно обновлен на ${status}`,
		);

		return e.json(200, { success: true, id: call_log_id, status: status });
	} catch (_err) {
		console.error("❌ [CALLS_ERROR] Ошибка обновления статуса звонка");
		return e.json(500, {
			code: "INTERNAL_ERROR",
			error: "Не удалось обновить статус звонка",
		});
	}
});
