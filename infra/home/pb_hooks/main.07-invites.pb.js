// Входит в модуль decomposition-набора main.0X: содержимое перенесено
// из main.pb.js с сохранением contract, middleware и логики.
// invites: генерация invite-кода с rate limiting.
/**
 * POST /api/custom/invites/generate
 * Генерация инвайт-кода с rate limiting (админы без ограничений).
 */
routerAdd(
	"POST",
	"/api/custom/invites/generate",
	(e) => {
		const DB = require(`${__hooks}/db.js`);
		const { SUPERUSERS_COLLECTION_NAME } = require(
			`${__hooks}/hook_constants.js`,
		);
		const user = e.auth;

		// Проверка лимитов (Rate Limiting) — админы без ограничений
		const isAdmin = user.collection().name === SUPERUSERS_COLLECTION_NAME;

		if (!isAdmin) {
			const pastTime = new Date(
				Date.now() - DB.CONFIG.INVITE_RATE_LIMIT_MINUTES * 60000,
			)
				.toISOString()
				.replace("T", " ");

			const recentInvites = $app.findRecordsByFilter(
				"invites",
				"created_by = {:createdBy} && created >= {:createdAfter}",
				"",
				1,
				0,
				{ createdBy: user.id, createdAfter: pastTime },
			);

			if (recentInvites.length > 0) {
				return e.json(429, {
					message: `Rate limit: Only 1 invite allowed per ${DB.CONFIG.INVITE_RATE_LIMIT_MINUTES} minute(s)`,
				});
			}
		}

		// Каноническое поле — token. Для регистрации room остаётся пустым;
		// приглашения в комнату создаются отдельным room-flow с тем же token.
		const inviteCollection = $app.findCollectionByNameOrId("invites");
		const record = new Record(inviteCollection);
		const token = `kk-${$security.randomString(32)}`;
		record.set("token", token);
		record.set("created_by", user.id);
		record.set("max_uses", 1);
		record.set("uses_count", 0);
		const expiresAt = new Date(
			Date.now() + DB.CONFIG.INVITE_DEFAULT_TTL_MINUTES * 60000,
		).toISOString();
		record.set("expires_at", expiresAt);

		$app.save(record);

		// `code` сохраняется только как совместимое имя ответа для текущего UI;
		// значение всегда равно canonical token, второго поля в schema нет.
		return e.json(200, { code: token });
	},
	$apis.requireAuth(),
);

/**
 * Проверка room invite без прямого list/view доступа к invites.
 * Возвращается только DTO, необходимый экрану присоединения.
 */
routerAdd(
	"POST",
	"/api/custom/invites/validate",
	(e) => {
		const token = e.requestInfo()?.body?.token;
		if (typeof token !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
			return e.json(404, { message: "Invite not found" });
		}

		const invites = $app.findRecordsByFilter(
			"invites",
			"token = {:inviteToken}",
			"",
			1,
			0,
			{ inviteToken: token },
		);
		if (invites.length === 0) {
			return e.json(404, { message: "Invite not found" });
		}

		const invite = invites[0];
		const expiresAt = invite.get("expires_at");
		const expiresAtMs = expiresAt ? Date.parse(expiresAt) : NaN;
		if (
			expiresAt &&
			(!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now())
		) {
			return e.json(404, { message: "Invite not found" });
		}
		const maxUses = Number(invite.get("max_uses") || 0);
		const usesCount = Number(invite.get("uses_count") || 0);
		if (
			!Number.isFinite(maxUses) ||
			!Number.isFinite(usesCount) ||
			maxUses < 0 ||
			usesCount < 0
		) {
			return e.json(404, { message: "Invite not found" });
		}
		const roomId = invite.get("room");
		if (!roomId || (maxUses > 0 && usesCount >= maxUses)) {
			return e.json(404, { message: "Invite not found" });
		}

		try {
			const room = $app.findRecordById("rooms", roomId);
			return e.json(200, {
				id: invite.id,
				room: room.id,
				expand: {
					room: {
						id: room.id,
						name: room.get("name"),
						type: room.get("type"),
						visibility: room.get("visibility"),
						avatar: room.get("avatar"),
						description: room.get("description"),
					},
				},
				expires_at: expiresAt,
				max_uses: maxUses,
				uses_count: usesCount,
			});
		} catch {
			return e.json(404, { message: "Invite not found" });
		}
	},
	$apis.requireAuth(),
);
