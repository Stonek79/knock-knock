/**
 * @module TaskHelpers
 * @description Изолированные функции для обработки задач.
 * Подгружаются через require() внутри изолированных VM cron-задач PocketBase.
 */

/**
 * ОБРАБОТЧИК PUSH-УВЕДОМЛЕНИЙ
 * @param {Object} payload - Полезная нагрузка задачи
 */
function handlePushTask(payload) {
	const DB = require(`${__hooks}/db.js`);
	const pushGatewayUrl =
		$os.getenv("PB_PUSH_GATEWAY_URL") || DB.CONFIG.PUSH_GATEWAY_DEFAULT_URL;

	if (!payload.subscriptions || payload.subscriptions.length === 0) {
		console.log("📡 [PUSH_DEBUG] Нет активных подписок для отправки push-уведомлений. Пропускаем.");
		return;
	}

	console.log(`📡 [PUSH_DEBUG] Отправка push-уведомления на шлюз: ${pushGatewayUrl}${DB.CONFIG.PUSH_GATEWAY_ENDPOINT} для ${payload.subscriptions.length} подписок...`);

	try {
		const res = $http.send({
			url: `${pushGatewayUrl}${DB.CONFIG.PUSH_GATEWAY_ENDPOINT}`,
			method: DB.VALUES.METHOD_POST,
			headers: { "Content-Type": DB.VALUES.CONTENT_TYPE_JSON },
			body: JSON.stringify({
				subscriptions: payload.subscriptions,
				payload: payload.data,
			}),
			timeout: 10,
		});

		console.log(`📡 [PUSH_DEBUG] Ответ push-шлюза: статус ${res.statusCode}`);

		if (res.statusCode < 200 || res.statusCode >= 300) {
			throw new Error(
				`Push Gateway error (Status: ${res.statusCode}): ${res.raw}`,
			);
		}
	} catch (httpErr) {
		console.error(`❌ [PUSH_DEBUG_ERROR] Сбой сети при отправке push-запроса: ${httpErr.message || httpErr}`);
		throw httpErr;
	}
}

/**
 * ЛОГИКА ОШИБОК И РЕТРАЕВ
 */
function handleTaskError(task, err) {
	const DB = require(`${__hooks}/db.js`);
	const attempts = task.getInt(DB.FIELDS.ATTEMPTS) + 1;
	const maxAttempts = 5;

	console.error(`❌ [TASK_ERROR] Задача ID: ${task.id} завершилась с ошибкой: ${err.message || String(err)} (Попытка: ${attempts}/${maxAttempts})`);

	task.set(DB.FIELDS.ATTEMPTS, attempts);
	task.set(DB.FIELDS.LAST_ERROR, err.message || String(err));

	if (attempts >= maxAttempts) {
		task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_FAILED);
	} else {
		const backoffMinutes = [1, 5, 15, 60][attempts - 1] || 60;
		const nextRun = new Date(Date.now() + backoffMinutes * 60000);

		task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_FAILED);
		task.set(
			DB.FIELDS.RUN_AT,
			nextRun.toISOString().replace("T", " ").split(".")[0],
		);
	}

	try {
		$app.save(task);
		console.log(`💾 [TASK_DEBUG] Состояние задачи ${task.id} обновлено после ошибки.`);
	} catch (saveErr) {
		console.error(`❌ [TASK_DEBUG_ERROR] Не удалось сохранить состояние ошибки для задачи ${task.id}: ${saveErr.message || saveErr}`);
	}
}

/**
 * ОЧИСТКА СТАРЫХ ЗАДАЧ
 */
function handleCleanupTask() {
	const DB = require(`${__hooks}/db.js`);
	const now = Date.now();

	const yesterday = new Date(now - 24 * 60 * 60 * 1000)
		.toISOString()
		.replace("T", " ")
		.split(".")[0];
	const oldSuccessful = $app.findRecordsByFilter(
		DB.TABLES.TASK_QUEUE,
		`${DB.FIELDS.STATUS} = '${DB.VALUES.STATUS_COMPLETED}' && ${DB.FIELDS.UPDATED} <= {:date}`,
		"",
		500,
		0,
		{ date: yesterday },
	);

	for (const rec of oldSuccessful) {
		$app.delete(rec);
	}

	const lastWeek = new Date(now - 7 * 24 * 60 * 60 * 1000)
		.toISOString()
		.replace("T", " ")
		.split(".")[0];
	const oldFailed = $app.findRecordsByFilter(
		DB.TABLES.TASK_QUEUE,
		`${DB.FIELDS.STATUS} = '${DB.VALUES.STATUS_FAILED}' && ${DB.FIELDS.UPDATED} <= {:date}`,
		"",
		500,
		0,
		{ date: lastWeek },
	);

	for (const rec of oldFailed) {
		$app.delete(rec);
	}
}

/**
 * РАСПРЕДЕЛИТЕЛЬ ЗАДАЧ
 * @param {Record} task - Объект записи из task_queue
 */
function processTask(task) {
	const DB = require(`${__hooks}/db.js`);
	const type = task.get(DB.FIELDS.TYPE);
	const payload = task.get(DB.FIELDS.PAYLOAD);

	task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_PROCESSING);
	$app.save(task);

	try {
		if (type === DB.VALUES.TASK_TYPE_PUSH) {
			handlePushTask(payload);
		} else if (type === DB.VALUES.TASK_TYPE_CLEANUP) {
			handleCleanupTask();
		}

		task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_COMPLETED);
		task.set(DB.FIELDS.LAST_ERROR, "");
		$app.save(task);
	} catch (err) {
		handleTaskError(task, err);
	}
}

// Экспортируем функции для использования внутри cron-обработчиков
module.exports = {
	processTask,
	handleCleanupTask,
};
