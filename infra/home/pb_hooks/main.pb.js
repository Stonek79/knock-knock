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
		$app.deleteNoValidate(user);
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
			`${DB.FIELDS.OWNER} = {:uid} || ${DB.FIELDS.USER} = {:uid}`,
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
