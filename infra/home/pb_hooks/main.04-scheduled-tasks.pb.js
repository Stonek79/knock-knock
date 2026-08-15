// Модуль получен при разбиении hooks-монолита: соответствует блоку
// из main.pb.js с сохранением порядка регистраций и поведения.
// scheduled tasks: bootstrap-сброс залипших задач и cron-задачи.
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
 * 6. CRON ЗАДАЧИ
 */

// 6.1. Очистка старых системных сообщений (старше 30 дней) - запускается каждую ночь в 3:00
cronAdd("cleanup_system_messages", "0 3 * * *", () => {
	const DB = require(`${__hooks}/db.js`);
	console.log("🧹 [CRON] Запуск очистки старых системных сообщений...");
	try {
		// В SQLite функции datetime работают с форматом "YYYY-MM-DD HH:MM:SSZ",
		// PocketBase хранит даты именно в таком виде.
		const result = $app
			.db()
			.newQuery(
				`DELETE FROM ${DB.TABLES.MESSAGES}
            WHERE created < datetime('now', '-30 days')
            AND room IN (SELECT id FROM ${DB.TABLES.ROOMS} WHERE type = 'system')`,
			)
			.execute();

		console.log(
			`🧹 [CRON] Удалено старых системных сообщений: ${result.rowsAffected() || 0}`,
		);
	} catch (err) {
		console.error(`❌ [CRON_ERROR] Ошибка очистки: ${err.message || err}`);
	}
});

// 6.2. Фоновая рассылка Broadcast сообщений - запускается каждую минуту
cronAdd("process_broadcasts", "* * * * *", () => {
	const DB = require(`${__hooks}/db.js`);
	try {
		const tasks = $app.findRecordsByFilter(
			DB.TABLES.TASK_QUEUE,
			`type = '${DB.VALUES.TASK_TYPE_BROADCAST}' && status = '${DB.VALUES.STATUS_PENDING}'`,
			"",
			10, // берем пачками
			0,
		);

		if (tasks.length === 0) {
			return;
		}

		for (const task of tasks) {
			task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_PROCESSING);
			$app.save(task);

			try {
				const payload = task.get(DB.FIELDS.PAYLOAD);
				const text = payload.text;
				const adminId = payload.adminId;
				const attachments = payload.attachments || [];
				const broadcastId = task.getString(DB.FIELDS.TASK_KEY);

				// Получаем коллекции
				const roomCollection = $app.findCollectionByNameOrId(DB.TABLES.ROOMS);
				const memberCollection = $app.findCollectionByNameOrId(
					DB.TABLES.MEMBERS,
				);
				const messageCollection = $app.findCollectionByNameOrId(
					DB.TABLES.MESSAGES,
				);

				// 1. Находим все существующие системные комнаты
				const existingSysRooms = $app.findRecordsByFilter(
					DB.TABLES.ROOMS,
					`type = 'system'`,
					"",
					100000,
					0,
				);

				// Строим индекс по ID для быстрой проверки
				const existingRoomIds = {};
				for (const r of existingSysRooms) {
					existingRoomIds[r.id] = true;
				}

				// 2. Самовосстановление: создаём системные комнаты для пользователей,
				//    которые зарегистрировались ДО внедрения функционала broadcast.
				const allUsers = $app.findRecordsByFilter(
					DB.TABLES.USERS,
					"",
					"",
					100000,
					0,
				);

				// Собираем итоговый список системных комнат (существующие + новые)
				const sysRooms = [...existingSysRooms];
				let autoCreatedCount = 0;

				for (const u of allUsers) {
					const deterministicId = $security
						.md5(`${u.id}system`)
						.substring(0, 15);
					if (existingRoomIds[deterministicId]) {
						continue;
					}
					try {
						const newRoom = new Record(roomCollection, {
							[DB.FIELDS.ID]: deterministicId,
							[DB.FIELDS.TYPE]: "system",
							[DB.FIELDS.NAME]: "Nemo System",
							[DB.FIELDS.VISIBILITY]: DB.VALUES.VISIBILITY_PRIVATE,
							[DB.FIELDS.CREATED_BY]: u.id,
						});
						$app.saveNoValidate(newRoom);

						const newMember = new Record(memberCollection, {
							[DB.FIELDS.ROOM]: newRoom.id,
							[DB.FIELDS.USER]: u.id,
							[DB.FIELDS.ROLE]: "member",
							[DB.FIELDS.UNREAD_COUNT]: 0,
						});
						$app.saveNoValidate(newMember);

						sysRooms.push(newRoom);
						existingRoomIds[deterministicId] = true;
						autoCreatedCount++;
					} catch (createErr) {
						console.error(
							`❌ [BROADCAST] Не удалось создать системную комнату для пользователя ${u.id}: ${createErr.message || createErr}`,
						);
					}
				}

				if (autoCreatedCount > 0) {
					console.log(
						`📣 [BROADCAST] Автосоздано системных комнат (миграция): ${autoCreatedCount}`,
					);
				}

				// 3. Отправляем broadcast-сообщение во все системные комнаты
				let successCount = 0;

				for (const room of sysRooms) {
					const msg = new Record(messageCollection, {
						content: text,
						room: room.id,
						sender: adminId,
						type: "system",
						attachments: attachments,
						metadata: { broadcast_id: broadcastId },
					});

					try {
						$app.saveNoValidate(msg);
						successCount++;
					} catch (e) {
						console.error(
							`❌ [BROADCAST_ERROR] Ошибка отправки в комнату ${room.id}: ${e.message || e}`,
						);
					}
				}

				console.log(
					`📣 [BROADCAST] Успешно отправлено ${successCount} сообщений (Task ID: ${task.id})`,
				);

				task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_COMPLETED);
				$app.save(task);
			} catch (innerErr) {
				console.error(
					`❌ [BROADCAST_ERROR] Ошибка выполнения задачи: ${innerErr.message || innerErr}`,
				);
				task.set(DB.FIELDS.STATUS, DB.VALUES.STATUS_FAILED);
				task.set(DB.FIELDS.LAST_ERROR, String(innerErr.message || innerErr));
				$app.save(task);
			}
		}
	} catch (err) {
		console.error(`❌ [BROADCAST_ERROR] Общая ошибка: ${err.message || err}`);
	}
});
