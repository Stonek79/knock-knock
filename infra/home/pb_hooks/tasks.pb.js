/**
 * @module TaskRunner
 * @description КНОК-КНОК: ВОРКЕР ФОНОВЫХ ЗАДАЧ
 *
 * Файл реализует логику циклической обработки очереди задач (пуши, очистка).
 */

/**
 * 1. ОСНОВНОЙ ЦИКЛ ОБРАБОТКИ
 * Выполняется каждую минуту согласно конфигурации в db.js.
 */
cronAdd("task_runner", DB.CONFIG.CRON_RUNNER, () => {
	const DB = require(`${__hooks}/db.js`);
	const nowStr = new Date().toISOString().replace("T", " ").split(".")[0];

	// Выборка задач: новые (pending) или упавшие (failed) с учетом ретраев
	const tasks = $app
		.dao()
		.findRecordsByFilter(
			DB.TABLES.TASK_QUEUE,
			`${DB.FIELDS.STATUS} = '${DB.VALUES.STATUS_PENDING}' || (${DB.FIELDS.STATUS} = '${DB.VALUES.STATUS_FAILED}' && ${DB.FIELDS.ATTEMPTS} < 5 && ${DB.FIELDS.RUN_AT} <= {:now})`,
			`+${DB.FIELDS.RUN_AT}`,
			20,
			0,
			{ now: nowStr },
		);

	if (tasks.length === 0) {
		return;
	}

	for (const task of tasks) {
		processTask(task);
	}
});

/**
 * РАСПРЕДЕЛИТЕЛЬ ЗАДАЧ
 * @param {Record} task - Объект записи из task_queue
 */
function processTask(task) {
	const DB = require(`${__hooks}/db.js`);
	const type = task.get(DB.FIELDS.TYPE);
	const payload = task.get(DB.FIELDS.PAYLOAD);

	task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_PROCESSING);
	$app.dao().saveRecord(task);

	try {
		if (type === DB.VALUES.TASK_TYPE_PUSH) {
			handlePushTask(payload);
		} else if (type === DB.VALUES.TASK_TYPE_CLEANUP) {
			handleCleanupTask();
		}

		task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_COMPLETED);
		task.set(DB.FIELDS.LAST_ERROR, "");
		$app.dao().saveRecord(task);
	} catch (err) {
		handleTaskError(task, err);
	}
}

/**
 * ОБРАБОТЧИК PUSH-УВЕДОМЛЕНИЙ
 * Отправляет данные на внешний шлюз уведомлений.
 * @param {Object} payload - Полезная нагрузка задачи (subscriptions + data)
 */
function handlePushTask(payload) {
	const DB = require(`${__hooks}/db.js`);
	const pushGatewayUrl =
		$os.getenv("PB_PUSH_GATEWAY_URL") || DB.CONFIG.PUSH_GATEWAY_DEFAULT_URL;

	if (!payload.subscriptions || payload.subscriptions.length === 0) {
		return;
	}

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

	if (res.statusCode < 200 || res.statusCode >= 300) {
		throw new Error(
			`Push Gateway error (Status: ${res.statusCode}): ${res.raw}`,
		);
	}
}

/**
 * ЛОГИКА ОШИБОК И ЭКСПОНЕНЦИАЛЬНОЙ ЗАДЕРЖКИ
 * @param {Record} task - Объект задачи
 * @param {Error} err - Исключение
 */
function handleTaskError(task, err) {
	const DB = require(`${__hooks}/db.js`);
	const attempts = task.getInt(DB.FIELDS.ATTEMPTS) + 1;
	const maxAttempts = 5;

	task.set(DB.FIELDS.ATTEMPTS, attempts);
	task.set(DB.FIELDS.LAST_ERROR, err.message || String(err));

	if (attempts >= maxAttempts) {
		task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_FAILED);
	} else {
		// Интервалы ретраев: 1, 5, 15, 60 минут
		const backoffMinutes = [1, 5, 15, 60][attempts - 1] || 60;
		const nextRun = new Date(Date.now() + backoffMinutes * 60000);

		task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_FAILED);
		task.set(
			DB.FIELDS.RUN_AT,
			nextRun.toISOString().replace("T", " ").split(".")[0],
		);
	}

	$app.dao().saveRecord(task);
}

/**
 * ЛОГИКА ОЧИСТКИ ОЧЕРЕДИ
 * Удаляет успешно выполненные задачи старше 24 часов и ошибки старше недели.
 */
function handleCleanupTask() {
	const DB = require(`${__hooks}/db.js`);
	const now = Date.now();

	// Очистка выполненных (24ч)
	const yesterday = new Date(now - 24 * 60 * 60 * 1000)
		.toISOString()
		.replace("T", " ")
		.split(".")[0];
	const oldSuccessful = $app
		.dao()
		.findRecordsByFilter(
			DB.TABLES.TASK_QUEUE,
			`${DB.FIELDS.STATUS} = '${DB.VALUES.STATUS_COMPLETED}' && ${DB.FIELDS.UPDATED} <= {:date}`,
			"",
			500,
			0,
			{ date: yesterday },
		);

	for (const rec of oldSuccessful) {
		$app.dao().deleteRecord(rec);
	}

	// Очистка фатальных ошибок (7 дней)
	const lastWeek = new Date(now - 7 * 24 * 60 * 60 * 1000)
		.toISOString()
		.replace("T", " ")
		.split(".")[0];
	const oldFailed = $app
		.dao()
		.findRecordsByFilter(
			DB.TABLES.TASK_QUEUE,
			`${DB.FIELDS.STATUS} = '${DB.VALUES.STATUS_FAILED}' && ${DB.FIELDS.UPDATED} <= {:date}`,
			"",
			500,
			0,
			{ date: lastWeek },
		);

	for (const rec of oldFailed) {
		$app.dao().deleteRecord(rec);
	}
}

/**
 * ЗАДАЧА ОЧИСТКИ ОЧЕРЕДИ ПО РАСПИСАНИЮ
 * Запускается ежедневно согласно CONFIG.CRON_CLEANUP.
 */
cronAdd("task_cleanup", DB.CONFIG.CRON_CLEANUP, () => {
	handleCleanupTask();
});
