/// <reference path="../pb_data/types.d.ts" />

routerAdd(
	"POST",
	"/api/invites/join",
	(e) => {
		const { consumeInviteAtomically } = require(`${__hooks}/invite_consumption.js`);
		const info = e.requestInfo();
		const body = info?.body || {};

		const token = typeof body.token === "string" ? body.token.trim() : "";
		const roomKeyEncrypted = body.roomKeyEncrypted;

		if (
			!/^[A-Za-z0-9_-]{16,64}$/.test(token) ||
			typeof roomKeyEncrypted !== "string" ||
			roomKeyEncrypted.length === 0
		) {
			throw new BadRequestError("Missing token or roomKeyEncrypted");
		}

		const user = e.auth;
		if (!user || user.collection().name !== "users") {
			throw new UnauthorizedError("Authentication required");
		}

		let invite;
		try {
			invite = $app.findFirstRecordByData("invites", "token", token);
		} catch {
			console.error("[INVITE_JOIN] invite lookup failed");
			throw new NotFoundError("Invite not found");
		}

		// Проверка срока жизни. Повреждённая дата считается недействительным
		// приглашением, а не бессрочным.
		const expiresAt = invite.get("expires_at");
		if (expiresAt) {
			const expiresAtMs = Date.parse(expiresAt);
			if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
				throw new BadRequestError("Invite expired");
			}
		}

		// Проверка лимитов
		const maxUses = invite.getInt("max_uses");
		const usesCount = invite.getInt("uses_count");
		if (maxUses < 0 || usesCount < 0) {
			throw new BadRequestError("Invite limit reached");
		}
		if (maxUses > 0 && usesCount >= maxUses) {
			throw new BadRequestError("Invite limit reached");
		}

		const roomId = invite.getString("room");
		if (!roomId) {
			throw new BadRequestError("Invite is not a room invite");
		}

		// Транзакция: добавить юзера в room_members, инкрементировать uses_count, добавить ключ в room_keys
		$app.runInTransaction((txApp) => {
			let existingMember = false;
			try {
				const members = txApp.findRecordsByFilter(
					"room_members",
					"room = {:room} && user = {:user}",
					"",
					1,
					0,
					{ room: roomId, user: user.id }
				);
				if (members && members.length > 0) {
					existingMember = true;
				}
			} catch {
				console.error("[INVITE_JOIN] member lookup failed");
				throw new Error("Invite join failed");
			}

			if (!existingMember) {
				const consumed = consumeInviteAtomically(txApp, invite.id, { room: roomId });
				if (!consumed) {
					throw new BadRequestError("Invite limit reached");
				}
			}

			if (!existingMember) {
				const memberCollection = txApp.findCollectionByNameOrId("room_members");
				const newMember = new Record(memberCollection);
				newMember.set("room", roomId);
				newMember.set("user", user.id);
				newMember.set("role", "member");
				txApp.saveNoValidate(newMember);
			}

			let existingKey = false;
			try {
				const keys = txApp.findRecordsByFilter(
					"room_keys",
					"room = {:room} && user = {:user}",
					"",
					1,
					0,
					{ room: roomId, user: user.id }
				);
				if (keys && keys.length > 0) {
					existingKey = true;
				}
			} catch {
				console.error("[INVITE_JOIN] key lookup failed");
				throw new Error("Invite join failed");
			}

			if (!existingKey) {
				const keysCollection = txApp.findCollectionByNameOrId("room_keys");
				const newKey = new Record(keysCollection);
				newKey.set("room", roomId);
				newKey.set("user", user.id);
				newKey.set("encrypted_key", roomKeyEncrypted);
				txApp.saveNoValidate(newKey);
			}
		});

		return e.json(200, { success: true, room: roomId });
	},
	// PocketBase image currently deployed by Nemo does not expose
	// requireRecordAuth(); the handler still validates e.auth above.
	$apis.requireAuth(),
);
