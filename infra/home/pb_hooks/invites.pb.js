/// <reference path="../pb_data/types.d.ts" />

routerAdd(
	"POST",
	"/api/invites/join",
	(e) => {
		const info = e.requestInfo();
		const body = info?.body || {};

		const token = body.token;
		const roomKeyEncrypted = body.roomKeyEncrypted;

		if (!token || !roomKeyEncrypted) {
			throw new BadRequestError("Missing token or roomKeyEncrypted");
		}

		const user = e.auth;
		if (!user || user.collection().name !== "users") {
			throw new UnauthorizedError("Authentication required");
		}

		let invite;
		try {
			invite = $app.findFirstRecordByData("invites", "token", token);
		} catch (err) {
			logError(`Error fetching invite: ${err}`);
			throw new NotFoundError("Invite not found");
		}

		// Проверка срока жизни
		if (invite.getDateTime("expires_at").time().unix() > 0) {
			if (
				invite.getDateTime("expires_at").time().unix() <
				Math.floor(Date.now() / 1000)
			) {
				throw new BadRequestError("Invite expired");
			}
		}

		// Проверка лимитов
		const maxUses = invite.getInt("max_uses");
		const usesCount = invite.getInt("uses_count");
		if (maxUses > 0 && usesCount >= maxUses) {
			throw new BadRequestError("Invite limit reached");
		}

		const roomId = invite.getString("room");

		// Транзакция: добавить юзера в room_members, инкрементировать uses_count, добавить ключ в room_keys
		$app.runInTransaction((txApp) => {
			invite.set("uses_count", usesCount + 1);
			txApp.saveNoValidate(invite);

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
			} catch (err) {
                logError(`Error fetching member: ${err}`);
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
			} catch (err) {
				logError(`Error fetching key: ${err}`);
			}

			if (!existingKey) {
				const keysCollection = txApp.findCollectionByNameOrId("room_keys");
				const newKey = new Record(keysCollection);
				newKey.set("room", roomId);
				newKey.set("user", user.id);
				newKey.set("key", roomKeyEncrypted);
				txApp.saveNoValidate(newKey);
			}
		});

		return e.json(200, { success: true, room: roomId });
	},
	// PocketBase image currently deployed by Nemo does not expose
	// requireRecordAuth(); the handler still validates e.auth above.
	$apis.requireAuth(),
);
