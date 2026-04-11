/**
 * @module TaskRunner
 * @description КНОК-КНОК: ВОРКЕР ФОНОВЫХ ЗАДАЧ
 *
 * Файл реализует логику циклической обработки очереди задач (пуши, очистка).
 */

// Импорт для верхнего уровня (настройка крона)
const DB_TOP = require(`${__hooks}/db.js`);

/**
 * 1. ОСНОВНОЙ ЦИКЛ ОБРАБОТКИ
 * Выполняется каждую минуту согласно конфигурации в db.js.
 */
cronAdd("task_runner", DB_TOP.CONFIG.CRON_RUNNER, () => {
	// Внутренний импорт для изоляции обработчика
	const DB = require(`${__hooks}/db.js`);
	const nowStr = new Date().toISOString().replace("T", " ").split(".")[0];

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
 * @param {Object} payload - Полезная нагрузка задачи
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
 * ЛОГИКА ОШИБОК И РЕТРАЕВ
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
 * ОЧИСТКА СТАРЫХ ЗАДАЧ
 */
function handleCleanupTask() {
	const DB = require(`${__hooks}/db.js`);
	const now = Date.now();

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

// Запуск очистки по расписанию
cronAdd("task_cleanup", DB_TOP.CONFIG.CRON_CLEANUP, () => {
	handleCleanupTask();
});
