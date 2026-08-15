// Модуль получен при разбиении hooks-монолита: соответствует блоку
// из main.pb.js с сохранением порядка регистраций и поведения.
// registration: контроль регистрации (tokenKey, honeypot, invite).
/**
 * 3. КОНТРОЛЬ РЕГИСТРАЦИИ (АНТИБОТ)
 * Генерирует tokenKey и проверяет защиту Honeypot/Time-check.
 */
onRecordCreateRequest((e) => {
	const DB = require(`${__hooks}/db.js`);
	try {
		const info =
			typeof e.requestInfo === "function" ? e.requestInfo() : e.requestInfo;
		const data = info?.Data || info?.data || {};

		// Автогенерация tokenKey для безопасности API
		if (!e.record.get(DB.FIELDS.TOKEN_KEY)) {
			e.record.set(DB.FIELDS.TOKEN_KEY, $security.randomString(30));
		}

		// Синхронизация подтверждения пароля
		if (!e.record.get(DB.FIELDS.PASSWORD_CONFIRM)) {
			const password = data.password;
			if (password) {
				e.record.set(DB.FIELDS.PASSWORD_CONFIRM, password);
			}
		}

		// Пропускаем проверки для администраторов
		const isSuperuser = e.hasSuperuserAuth?.() || e.get?.(DB.FIELDS.ADMIN);
		if (isSuperuser) {
			return e.next();
		}

		// Ловушка для ботов (Honeypot)
		if (data[DB.FIELDS.USERNAME_BOT]) {
			throw $errors.badRequest("Bot detected (honeypot)");
		}

		// Проверка времени заполнения формы
		const startTimeStr = data[DB.FIELDS.START_TIME];
		const start = parseInt(startTimeStr || "0", 10);
		if (startTimeStr && Date.now() - start < 2000) {
			throw $errors.badRequest("Bot detected (too fast)");
		}

		// Проверка инвайт-кода
		const inviteCodeRaw = data.invite_code;
		if (!inviteCodeRaw) {
			throw $errors.badRequest("Invite code is required");
		}
		const invites = e.app.findRecordsByFilter(
			"invites",
			"code = {:inviteCode} && status = 'active'",
			"",
			1,
			0,
			{ inviteCode: inviteCodeRaw },
		);
		if (invites.length === 0) {
			throw $errors.badRequest("Invalid or inactive invite code");
		}
		const invite = invites[0];

		// Подменяем код на id инвайта для связи
		e.record.set("invite_code", invite.id);
	} catch (err) {
		console.error("❌ [REGISTRATION_BLOCKED]:", err.message || err);
		// Invite validation is a security boundary. Never continue registration
		// after a failed lookup or malformed invite payload.
		throw err;
	}

	return e.next();
}, "users");
