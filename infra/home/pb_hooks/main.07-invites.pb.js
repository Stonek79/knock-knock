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

		// Генерация инвайт-кода
		const inviteCollection = $app.findCollectionByNameOrId("invites");
		const record = new Record(inviteCollection);
		const code = `kk-${$security.randomString(8)}`;
		record.set("code", code);
		record.set("created_by", user.id);
		record.set("status", "active");

		$app.save(record);

		return e.json(200, { code: code });
	},
	$apis.requireAuth(),
);
