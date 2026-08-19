// Модуль получен при разбиении hooks-монолита: соответствует блоку
// из main.pb.js с сохранением порядка регистраций и поведения.
// lifecycle: self-room «Избранное» и каскадное удаление пользователя.
/**
 * 1. ИНИЦИАЛИЗАЦИЯ ИЗБРАННОГО
 * Создает персональную комнату "Избранное" при успешной регистрации.
 */
onRecordAfterCreateSuccess((e) => {
	const DB = require(`${__hooks}/db.js`);
	const user = e.record;

	console.log("🚀 [REG_DEBUG] Начало инициализации Избранного");

	// Генерация детерминированного ID для комнаты на основе ID пользователя
	const rawHash = $security.md5(`"${DB.VALUES.PREFIX_SELF_CHAT}" ${user.id}`);
	const deterministicId = rawHash.slice(0, 15);

	console.log("🔍 [REG_DEBUG] Идентификатор комнаты Избранного подготовлен");

	// Безопасная проверка существования комнаты без генерации исключений в БД
	let rooms = [];
	try {
		rooms = e.app.findRecordsByFilter(
			DB.TABLES.ROOMS,
			"id = {:roomId}",
			"",
			1,
			0,
			{ roomId: deterministicId },
		);
	} catch (filterErr) {
		console.error(
			`❌ [REG_DEBUG_ERROR] Ошибка при проверке существования комнаты: ${filterErr.message || filterErr}`,
		);
	}

	if (rooms.length > 0) {
		console.log(
			"ℹ️ [REG_DEBUG] Избранное уже существует; создание не требуется",
		);
		e.next();
		return;
	}

	console.log(`📦 [REG_DEBUG] Комната Избранного не найдена. Создаем новую...`);

	try {
		const roomCollection = e.app.findCollectionByNameOrId(DB.TABLES.ROOMS);
		const memberCollection = e.app.findCollectionByNameOrId(DB.TABLES.MEMBERS);

		console.log(`🔐 [REG_DEBUG] Создаем комнату...`);

		// Создание комнаты
		const room = new Record(roomCollection, {
			[DB.FIELDS.ID]: deterministicId,
			[DB.FIELDS.TYPE]: DB.VALUES.ROOM_TYPE_DIRECT,
			[DB.FIELDS.NAME]: DB.VALUES.FAVORITES_NAME,
			[DB.FIELDS.VISIBILITY]: DB.VALUES.VISIBILITY_PRIVATE,
			[DB.FIELDS.CREATED_BY]: user.id,
		});
		e.app.saveNoValidate(room);

		console.log(`🔐 [REG_DEBUG] Комната создана. Добавляем участника...`);

		// Добавление единственного участника (себя)
		const member = new Record(memberCollection, {
			[DB.FIELDS.ROOM]: room.id,
			[DB.FIELDS.USER]: user.id,
			[DB.FIELDS.ROLE]: DB.VALUES.ROLE_OWNER,
			[DB.FIELDS.UNREAD_COUNT]: 0,
		});
		e.app.saveNoValidate(member);

		console.log("⭐ [REG] Избранное успешно создано");

		// Создание системной комнаты (Nemo)
		const sysDeterministicId = $security
			.md5(`${user.id}system`)
			.substring(0, 15);
		const sysRoom = new Record(roomCollection, {
			[DB.FIELDS.ID]: sysDeterministicId,
			[DB.FIELDS.TYPE]: "system",
			[DB.FIELDS.NAME]: "Nemo System",
			[DB.FIELDS.VISIBILITY]: DB.VALUES.VISIBILITY_PRIVATE,
			[DB.FIELDS.CREATED_BY]: user.id,
		});
		e.app.saveNoValidate(sysRoom);

		const sysMember = new Record(memberCollection, {
			[DB.FIELDS.ROOM]: sysRoom.id,
			[DB.FIELDS.USER]: user.id,
			[DB.FIELDS.ROLE]: "member", // обычный участник (только чтение на фронтенде)
			[DB.FIELDS.UNREAD_COUNT]: 0,
		});
		e.app.saveNoValidate(sysMember);
	} catch (err) {
		console.error(
			`❌ [REG_ERROR] Ошибка при создании Избранного: ${err.message || err}`,
		);
	}

	e.next();
}, "users");

/**
 * 2. КАСКАДНОЕ УДАЛЕНИЕ ДАННЫХ
 * Удаляет связанные файлы и личные чаты при удалении пользователя.
 */
onRecordAfterDeleteSuccess((e) => {
	const DB = require(`${__hooks}/db.js`);
	const user = e.record;

	// Удаление медиафайлов
	try {
		const mediaRecords = e.app.findRecordsByFilter(
			DB.TABLES.MEDIA,
			`${DB.FIELDS.CREATED_BY} = {:uid}`,
			"-created",
			500,
			0,
			{ uid: user.id },
		);
		for (const rec of mediaRecords) {
			e.app.deleteNoValidate(rec);
		}
	} catch (err) {
		console.error(`❌ [CLEANUP_ERROR] Медиа: ${err}`);
	}

	// Удаление личных диалогов
	try {
		const memberRecords = e.app.findRecordsByFilter(
			DB.TABLES.MEMBERS,
			`${DB.FIELDS.USER} = {:uid}`,
			"-created",
			1000,
			0,
			{ uid: user.id },
		);

		for (const member of memberRecords) {
			const roomId = member.get(DB.FIELDS.ROOM);
			const room = e.app.findRecordById(DB.TABLES.ROOMS, roomId);

			if (room && room.get(DB.FIELDS.TYPE) === DB.VALUES.ROOM_TYPE_DIRECT) {
				e.app.deleteNoValidate(room);
				console.log("🗑️ [CLEANUP] Удален личный чат");
			}
		}
	} catch (err) {
		console.error(`❌ [CLEANUP_ERROR] Комнаты: ${err}`);
	}

	e.next();
}, "users");
