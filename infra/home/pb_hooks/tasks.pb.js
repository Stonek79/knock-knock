/**
 * @module TaskRunner
 * @description КНОК-КНОК: ВОРКЕР ФОНОВЫХ ЗАДАЧ
 *
 * Файл реализует логику циклической обработки очереди задач (пуши, очистка).
 */

// Импорт для верхнего уровня (настройка крона)
const DB_TOP = require(`${__hooks}/db.js`);

// Флаг для предотвращения параллельного наложения кронов при зависании сети
let isTaskRunnerRunning = false;

/**
 * 1. ОСНОВНОЙ ЦИКЛ ОБРАБОТКИ
 * Выполняется каждую минуту согласно конфигурации в db.js.
 */
cronAdd("task_runner", DB_TOP.CONFIG.CRON_RUNNER, () => {
	// Внутренние импорты обязательны, так как крон выполняется в полностью изолированной VM
	const DB = require(`${__hooks}/db.js`);
	const helpers = require(`${__hooks}/task_helpers.js`);

	const nowStr = new Date().toISOString().replace("T", " ").split(".")[0];

	if (isTaskRunnerRunning) {
		console.log(`⏰ [CRON_DEBUG] Предыдущий запуск task_runner в ${nowStr} еще активен. Пропускаем этот тик.`);
		return;
	}

	isTaskRunnerRunning = true;
	console.log(`⏰ [CRON_DEBUG] Запуск task_runner в ${nowStr}`);

	let tasks = [];
	try {
		tasks = $app.findRecordsByFilter(
			DB.TABLES.TASK_QUEUE,
			`${DB.FIELDS.STATUS} = '${DB.VALUES.STATUS_PENDING}' || (${DB.FIELDS.STATUS} = '${DB.VALUES.STATUS_FAILED}' && ${DB.FIELDS.ATTEMPTS} < 5 && ${DB.FIELDS.RUN_AT} <= {:now})`,
			`+${DB.FIELDS.RUN_AT}`,
			20,
			0,
			{ now: nowStr },
		);
	} catch (findErr) {
		console.error(`❌ [CRON_DEBUG] Ошибка при поиске задач в очереди: ${findErr.message || findErr}`);
		isTaskRunnerRunning = false;
		return;
	}

	if (tasks.length === 0) {
		isTaskRunnerRunning = false;
		return;
	}

	console.log(`⏰ [CRON_DEBUG] Найдено задач для обработки: ${tasks.length}`);

	try {
		for (const task of tasks) {
			try {
				console.log(`⏰ [CRON_DEBUG] Обработка задачи ID: ${task.id}, Тип: ${task.get(DB.FIELDS.TYPE)}, Статус: ${task.get(DB.FIELDS.STATUS)}`);
				helpers.processTask(task);
			} catch (taskErr) {
				console.error(`❌ [CRON_DEBUG] Сбой при обработке задачи ${task.id}: ${taskErr.message || taskErr}`);
			}
		}
	} finally {
		isTaskRunnerRunning = false;
	}
});

/**
 * 2. ОЧИСТКА ПО РАСПИСАНИЮ
 */
cronAdd("task_cleanup", DB_TOP.CONFIG.CRON_CLEANUP, () => {
	const helpers = require(`${__hooks}/task_helpers.js`);
	helpers.handleCleanupTask();
});
