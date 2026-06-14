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
	// Внутренние импорты обязательны, так как крон выполняется в полностью изолированной VM
	const DB = require(`${__hooks}/db.js`);
	const helpers = require(`${__hooks}/task_helpers.js`);

	// Проверяем лок выполнения с помощью runtime store приложения
	if ($app.store().has("isTaskRunnerRunning")) {
		console.log("⏰ [CRON_DEBUG] task_runner уже выполняется в данный момент, пропуск тика.");
		return;
	}

	$app.store().set("isTaskRunnerRunning", true);

	try {
		const nowStr = new Date().toISOString().replace("T", " ").split(".")[0];
		console.log(`⏰ [CRON_DEBUG] Запуск task_runner в ${nowStr}`);

		// Самолечение: перевод задач, зависших в статусе processing более 10 минут, в статус failed
		try {
			const timeoutTime = new Date(Date.now() - 10 * 60000)
				.toISOString()
				.replace("T", " ")
				.split(".")[0];
			const cleanupResult = $app
				.db()
				.newQuery(
					`UPDATE ${DB.TABLES.TASK_QUEUE} 
					 SET ${DB.FIELDS.STATUS} = {:failed}, 
					     ${DB.FIELDS.LAST_ERROR} = {:error_msg},
					     ${DB.FIELDS.ATTEMPTS} = ${DB.FIELDS.ATTEMPTS} + 1
					 WHERE ${DB.FIELDS.STATUS} = {:processing} AND ${DB.FIELDS.UPDATED} <= {:timeout_time}`,
				)
				.bind({
					failed: DB.VALUES.STATUS_FAILED,
					error_msg: "Task timeout (stuck in processing for > 10 minutes)",
					processing: DB.VALUES.STATUS_PROCESSING,
					timeout_time: timeoutTime,
				})
				.execute();

			const affectedRows = cleanupResult.rowsAffected() || 0;
			if (affectedRows > 0) {
				console.log(`⏰ [CRON_DEBUG] Самолечение: обнаружено и сброшено зависших задач: ${affectedRows}`);
			}
		} catch (cleanupErr) {
			console.error(`❌ [CRON_DEBUG] Ошибка при самолечении зависших задач: ${cleanupErr.message || cleanupErr}`);
		}

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
			console.error(
				`❌ [CRON_DEBUG] Ошибка при поиске задач в очереди: ${findErr.message || findErr}`,
			);
			return;
		}

		if (tasks.length === 0) {
			return;
		}

		console.log(`⏰ [CRON_DEBUG] Найдено задач для обработки: ${tasks.length}`);

		for (const task of tasks) {
			try {
				console.log(
					`⏰ [CRON_DEBUG] Обработка задачи ID: ${task.id}, Тип: ${task.get(DB.FIELDS.TYPE)}, Статус: ${task.get(DB.FIELDS.STATUS)}`,
				);
				helpers.processTask(task);
			} catch (taskErr) {
				console.error(
					`❌ [CRON_DEBUG] Сбой при обработке задачи ${task.id}: ${taskErr.message || taskErr}`,
				);
			}
		}
	} finally {
		$app.store().remove("isTaskRunnerRunning");
	}
});

/**
 * 2. ОЧИСТКА ПО РАСПИСАНИЮ
 */
cronAdd("task_cleanup", DB_TOP.CONFIG.CRON_CLEANUP, () => {
	const helpers = require(`${__hooks}/task_helpers.js`);
	helpers.handleCleanupTask();
});
