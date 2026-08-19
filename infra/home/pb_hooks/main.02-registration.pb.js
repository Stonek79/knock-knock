// Модуль получен при разбиении hooks-монолита: соответствует блоку
// из main.pb.js с сохранением порядка регистраций и поведения.
// registration: контроль регистрации (tokenKey, honeypot, invite).
/**
 * 3. КОНТРОЛЬ РЕГИСТРАЦИИ (АНТИБОТ)
 * Генерирует tokenKey и проверяет защиту Honeypot/Time-check.
 */
onRecordCreateRequest((e) => {
	const DB = require(`${__hooks}/db.js`);
	const { consumeInviteAtomically } = require(`${__hooks}/invite_consumption.js`);
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

		// `invite_code` — историческое имя входного поля клиента. В хранилище
		// используется единый канонический секрет `invites.token`.
		const inviteToken =
			typeof data.invite_code === "string" ? data.invite_code.trim() : "";
		if (!/^[A-Za-z0-9_-]{16,64}$/.test(inviteToken)) {
			throw $errors.badRequest("Invite code is required");
		}
		const invites = e.app.findRecordsByFilter(
			"invites",
			"token = {:inviteToken}",
			"",
			1,
			0,
			{ inviteToken },
		);
		if (invites.length === 0) {
			throw $errors.badRequest("Invalid invite code");
		}
		const invite = invites[0];
		const expiresAt = invite.get("expires_at");
		const expiresAtMs = expiresAt ? Date.parse(expiresAt) : NaN;
		if (expiresAt && (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now())) {
			throw $errors.badRequest("Invite expired");
		}
		const maxUsesRaw = invite.get("max_uses");
		const usesCountRaw = invite.get("uses_count");
		const maxUses = Number(maxUsesRaw || 0);
		const usesCount = Number(usesCountRaw || 0);
		if (
			!Number.isFinite(maxUses) ||
			!Number.isFinite(usesCount) ||
			maxUses < 0 ||
			usesCount < 0
		) {
			throw $errors.badRequest("Invalid invite code");
		}
		if (maxUses > 0 && usesCount >= maxUses) {
			throw $errors.badRequest("Invite limit reached");
		}
		// Room invites are consumed by /api/invites/join, not registration.
		if (invite.get("room")) {
			throw $errors.badRequest("Registration invite required");
		}

		// The read above is only for a useful error message. The final decision is
		// made by one conditional SQL UPDATE so concurrent registrations cannot
		// both spend the same usage slot.
		let consumed;
		try {
			consumed = consumeInviteAtomically(e.app, invite.id, { room: "" });
		} catch {
			throw $errors.badRequest("Invite unavailable");
		}
		if (!consumed) {
			throw $errors.badRequest("Invite limit reached");
		}

		// Сохраняем только внутреннюю связь с invite, никогда не сам token.
		e.record.set("invite_code", invite.id);
	} catch (err) {
		console.error("❌ [REGISTRATION_BLOCKED]");
		// Invite validation is a security boundary. Never continue registration
		// after a failed lookup or malformed invite payload.
		throw err;
	}

	return e.next();
}, "users");
