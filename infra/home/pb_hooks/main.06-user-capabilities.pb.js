// Входит в модуль decomposition-набора main.0X: содержимое перенесено
// из main.pb.js с сохранением contract, middleware и логики.
// user capabilities: contacts, public search и keys (allowlist DTO).
// Константы route-строк (registration-only) берутся из hook_constants.
const routeConstants = require(`${__hooks}/hook_constants.js`);

/**
 * GET /api/custom/users/contacts
 * Возвращает список пользователей, с которыми текущий юзер имеет общие комнаты,
 * через отдельный membership-scoped DTO (UsersDto.toContactProfileDto).
 * Для private/unknown профиля DTO fail-closed: только { id, profile_type } —
 * без name/username/avatar/status/last_seen и без технического id fallback.
 * Все динамические фильтры строятся через parameter binding.
 */
routerAdd(
	"GET",
	routeConstants.USERS_API_ROUTES.CONTACTS,
	(e) => {
		const DB = require(`${__hooks}/db.js`);
		const { USERS_ROUTE_LIMITS } = require(`${__hooks}/hook_constants.js`);
		const UsersDto = require(`${__hooks}/users_dto.js`);
		const userId = e.auth.id;

		try {
			const myMembers = $app.findRecordsByFilter(
				DB.TABLES.MEMBERS,
				`user = {:userId}`,
				"",
				USERS_ROUTE_LIMITS.MAX_CONTACTS,
				0,
				{ userId: userId },
			);
			if (myMembers.length === 0) {
				return e.json(200, []);
			}

			const roomIds = [...new Set(myMembers.map((m) => m.get(DB.FIELDS.ROOM)))];
			if (roomIds.length === 0) {
				return e.json(200, []);
			}

			// Parameter-bound OR-фильтр по комнатам (без интерполяции ввода).
			const roomOr = UsersDto.buildOrBoundFilter(
				DB.FIELDS.ROOM,
				roomIds,
				"room",
			);
			const otherMembers = $app.findRecordsByFilter(
				DB.TABLES.MEMBERS,
				`user != {:userId} && (${roomOr.filter})`,
				"",
				USERS_ROUTE_LIMITS.MAX_CONTACTS,
				0,
				Object.assign({ userId: userId }, roomOr.params),
			);
			const otherUserIds = [
				...new Set(otherMembers.map((m) => m.get(DB.FIELDS.USER))),
			];
			if (otherUserIds.length === 0) {
				return e.json(200, []);
			}

			const userOr = UsersDto.buildOrBoundFilter(
				DB.FIELDS.ID,
				otherUserIds.slice(0, USERS_ROUTE_LIMITS.MAX_CONTACTS),
				"uid",
			);
			const users = $app.findRecordsByFilter(
				DB.TABLES.USERS,
				userOr.filter,
				"",
				USERS_ROUTE_LIMITS.MAX_CONTACTS,
				0,
				userOr.params,
			);

			const result = users.map(UsersDto.toContactProfileDto);

			return e.json(200, result);
		} catch (err) {
			console.error("❌ [CONTACTS] Ошибка:", err);
			return e.json(500, { message: "Internal Server Error" });
		}
	},
	$apis.requireAuth(),
);

/**
 * GET /api/custom/users/search?q=...&page=...&perPage=...
 * Поиск публичных профилей через явный allowlist DTO
 * (UsersDto.toPublicProfileSearchDto). Для обычного пользователя пустой запрос
 * не превращается в выдачу всех записей. Суперпользователь при пустом q
 * получает отдельный минимальный административный DTO (не publicExport()).
 * Параметры q/page/perPage валидируются и ограничиваются; фильтры — через
 * parameter binding.
 */
routerAdd(
	"GET",
	routeConstants.USERS_API_ROUTES.SEARCH,
	(e) => {
		const DB = require(`${__hooks}/db.js`);
		const { USERS_ROUTE_LIMITS, SUPERUSERS_COLLECTION_NAME } = require(
			`${__hooks}/hook_constants.js`,
		);
		const UsersDto = require(`${__hooks}/users_dto.js`);
		const user = e.auth;
		const q = (e.request.url.query().get("q") || "").trim();
		if (q.length > USERS_ROUTE_LIMITS.MAX_SEARCH_QUERY_LENGTH) {
			return e.json(400, { message: "Search query is too long" });
		}
		const isSuperuser =
			user?.collection() &&
			user.collection().name === SUPERUSERS_COLLECTION_NAME;

		// Валидация и clamp пагинации.
		let page = parseInt(e.request.url.query().get("page") || "1", 10);
		let perPage = parseInt(
			e.request.url.query().get("perPage") ||
				String(USERS_ROUTE_LIMITS.DEFAULT_SEARCH_PAGE_SIZE),
			10,
		);
		if (!Number.isFinite(page) || page < 1) {
			page = 1;
		}
		if (!Number.isFinite(perPage) || perPage < 1) {
			perPage = USERS_ROUTE_LIMITS.DEFAULT_SEARCH_PAGE_SIZE;
		}
		if (perPage > USERS_ROUTE_LIMITS.MAX_SEARCH_PAGE_SIZE) {
			perPage = USERS_ROUTE_LIMITS.MAX_SEARCH_PAGE_SIZE;
		}
		if (page > USERS_ROUTE_LIMITS.MAX_SEARCH_PAGE) {
			page = USERS_ROUTE_LIMITS.MAX_SEARCH_PAGE;
		}
		const offset = (page - 1) * perPage;

		if (isSuperuser) {
			try {
				const filter = q
					? "(username ~ {:query} || display_name ~ {:query})"
					: "";
				const users = $app.findRecordsByFilter(
					DB.TABLES.USERS,
					filter,
					"-created",
					perPage,
					offset,
					q ? { query: q } : {},
				);
				return e.json(200, users.map(UsersDto.toAdminUserDto));
			} catch (err) {
				console.error("❌ [ADMIN_USERS] Ошибка:", err);
				return e.json(500, { message: "Internal Server Error" });
			}
		}

		if (!q) {
			// Пустой поиск обычного пользователя не раскрывает всех users.
			return e.json(200, []);
		}

		try {
			const users = $app.findRecordsByFilter(
				DB.TABLES.USERS,
				`${UsersDto.USER_FIELDS.PROFILE_TYPE} = {:publicType} && (${UsersDto.USER_FIELDS.USERNAME} ~ {:query} || ${UsersDto.USER_FIELDS.DISPLAY_NAME} ~ {:query})`,
				"-created",
				perPage,
				offset,
				{ publicType: UsersDto.USER_PROFILE_TYPE_PUBLIC, query: q },
			);

			return e.json(200, users.map(UsersDto.toPublicProfileSearchDto));
		} catch (err) {
			console.error("❌ [SEARCH] Ошибка:", err);
			return e.json(500, { message: "Internal Server Error" });
		}
	},
	$apis.requireAuth(),
);

/**
 * POST /api/custom/users/keys
 * Возвращает публичные E2EE-ключи только для identity, для которых у
 * запрашивающего есть серверная capability: сам пользователь, public
 * профиль либо подтверждённая общая существующая комната. Тело:
 * { userIds: string[], roomId?: string }.
 *
 * userIds дедуплицируются, валидируются и ограничиваются ДО проверок.
 * Ответ — только { id, public_key_x25519, public_key_signing }; пустой или
 * отсутствующий обязательный ключ даёт детерминированный отказ (пропуск),
 * fallback на прямое чтение users запрещён. Клиентское заявление о membership
 * не принимается: сервер сам проверяет self/public/shared-room.
 */
routerAdd(
	"POST",
	routeConstants.USERS_API_ROUTES.KEYS,
	(e) => {
		const DB = require(`${__hooks}/db.js`);
		const { USERS_ROUTE_LIMITS } = require(`${__hooks}/hook_constants.js`);
		const UsersDto = require(`${__hooks}/users_dto.js`);
		const parseJsonBody = require(`${__hooks}/request_utils.js`).parseJsonBody;
		const requesterId = e.auth.id;

		const body = parseJsonBody(e);
		if (UsersDto.hasTooManyUserIds(body?.userIds)) {
			return e.json(400, { message: "Too many user IDs" });
		}
		const userIds = UsersDto.sanitizeAndCapUserIds(body?.userIds);
		if (userIds.length === 0) {
			return e.json(200, []);
		}
		const roomId =
			body && typeof body.roomId === "string" && body.roomId.trim() !== ""
				? body.roomId
				: null;

		// Если указан roomId, запрашивающий обязан быть участником этой комнаты.
		if (roomId) {
			try {
				const requesterMembers = $app.findRecordsByFilter(
					DB.TABLES.MEMBERS,
					`room = {:roomId} && user = {:userId}`,
					"",
					1,
					0,
					{ roomId: roomId, userId: requesterId },
				);
				if (requesterMembers.length === 0) {
					return e.json(403, {
						message: "Access denied. You are not a member of this room.",
					});
				}
			} catch (err) {
				console.error("❌ [USERS_KEYS] Ошибка проверки комнаты:", err);
				return e.json(500, { message: "Internal Server Error" });
			}
		}

		// Комнаты запрашивающего для проверки "общая существующая комната".
		let requesterRoomIds = [];
		try {
			const myMembers = $app.findRecordsByFilter(
				DB.TABLES.MEMBERS,
				`user = {:userId}`,
				"",
				USERS_ROUTE_LIMITS.MAX_CONTACTS,
				0,
				{ userId: requesterId },
			);
			requesterRoomIds = [
				...new Set(myMembers.map((m) => m.get(DB.FIELDS.ROOM))),
			];
		} catch (err) {
			console.error("❌ [USERS_KEYS] Ошибка загрузки комнат:", err);
			return e.json(500, { message: "Internal Server Error" });
		}

		const targetOr = UsersDto.buildOrBoundFilter(
			DB.FIELDS.ID,
			userIds,
			"target",
		);
		let targets;
		try {
			targets = $app.findRecordsByFilter(
				DB.TABLES.USERS,
				targetOr.filter,
				"",
				UsersDto.MAX_USERS_PER_KEYS_REQUEST,
				0,
				targetOr.params,
			);
		} catch (err) {
			console.error("❌ [USERS_KEYS] Ошибка загрузки пользователей:", err);
			return e.json(500, { message: "Internal Server Error" });
		}

		const sharedUserIds = new Set();
		if (requesterRoomIds.length > 0) {
			try {
				const roomOr = UsersDto.buildOrBoundFilter(
					DB.FIELDS.ROOM,
					requesterRoomIds,
					"room",
				);
				const memberOr = UsersDto.buildOrBoundFilter(
					DB.FIELDS.USER,
					userIds,
					"member",
				);
				const sharedMembers = $app.findRecordsByFilter(
					DB.TABLES.MEMBERS,
					`(${roomOr.filter}) && (${memberOr.filter})`,
					"",
					USERS_ROUTE_LIMITS.MAX_CONTACTS,
					0,
					Object.assign({}, roomOr.params, memberOr.params),
				);
				for (const member of sharedMembers) {
					sharedUserIds.add(member.get(DB.FIELDS.USER));
				}
			} catch (err) {
				console.error("❌ [USERS_KEYS] Ошибка проверки общих комнат:", err);
				return e.json(500, { message: "Internal Server Error" });
			}
		}

		const result = [];
		for (const target of targets) {
			const targetId = target.id;
			const isSelf = targetId === requesterId;
			const isTargetPublic =
				target.getString(UsersDto.USER_FIELDS.PROFILE_TYPE) ===
				UsersDto.USER_PROFILE_TYPE_PUBLIC;

			if (!isSelf && !isTargetPublic && !sharedUserIds.has(targetId)) {
				continue;
			}

			const dto = UsersDto.toPublicKeyDto(target);
			if (dto) {
				result.push(dto);
			}
		}

		return e.json(200, result);
	},
	$apis.requireAuth(),
);
