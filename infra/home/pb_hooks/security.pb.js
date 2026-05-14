/**
 * @module SecurityHooks
 * @description Защита сложных бизнес-правил и RLS (Row Level Security) на уровне полей,
 * которые невозможно декларативно описать в JSON-схеме PocketBase.
 */

// 1. ЗАЩИТА ОТ ЭСКАЛАЦИИ ПРИВИЛЕГИЙ ПРИ СОЗДАНИИ (Создание админов и владельцев)
onRecordCreateRequest((e) => {
	const authRecord = e.requestInfo().authRecord;
	if (!authRecord || authRecord.collection().name !== "users") return;

	const isGlobalAdmin = authRecord.get("role") === "admin";
	if (isGlobalAdmin) return;

	const role = e.record.get("role");
	const targetUserId = e.record.get("user");
	const roomId = e.record.get("room");

	if (role === "owner") {
		// Создавать 'owner' можно только при инициализации комнаты (создатель = текущий юзер)
		const room = $app.findRecordById("rooms", roomId);
		if (
			room.get("created_by") !== authRecord.id ||
			targetUserId !== authRecord.id
		) {
			throw new BadRequestError("Security Policy: Invalid owner assignment.");
		}
	} else if (role === "admin") {
		// Назначать админа при добавлении в комнату может только текущий 'owner'
		try {
			const currentUserMember = $app.findFirstRecordByFilter(
				"room_members",
				"room = {:room} && user = {:user}",
				{ room: roomId, user: authRecord.id },
			);
			if (currentUserMember.get("role") !== "owner") {
				throw new BadRequestError(
					"Security Policy: Only the room owner can appoint admins.",
				);
			}
		} catch (err) {
			console.log(err);
			throw new BadRequestError("Security Policy: Permission denied.");
		}
	}
}, "room_members");

// 2. ЗАЩИТА ОТ ЭСКАЛАЦИИ ПРИВИЛЕГИЙ ПРИ ОБНОВЛЕНИИ (Смена ролей)
onRecordUpdateRequest((e) => {
	const authRecord = e.requestInfo().authRecord;
	if (!authRecord || authRecord.collection().name !== "users") return;

	const isGlobalAdmin = authRecord.get("role") === "admin";
	if (isGlobalAdmin) return;

	const oldRecord = $app.findRecordById("room_members", e.record.id);
	const oldRole = oldRecord.get("role");
	const newRole = e.record.get("role");

	// Если поле role было изменено
	if (oldRole !== newRole) {
		const roomId = e.record.get("room");
		try {
			const currentUserMember = $app.findFirstRecordByFilter(
				"room_members",
				"room = {:room} && user = {:user}",
				{ room: roomId, user: authRecord.id },
			);

			if (currentUserMember.get("role") !== "owner") {
				throw new BadRequestError(
					"Security Policy: Only the room owner can change roles.",
				);
			}
		} catch (err) {
			console.log(err);
			throw new BadRequestError("Security Policy: Permission denied.");
		}
	}
}, "room_members");

// 3. ЗАЩИТА ОТ УДАЛЕНИЯ ВЛАДЕЛЬЦА КОМНАТЫ
onRecordDeleteRequest((e) => {
	const role = e.record.get("role");
	if (role === "owner") {
		throw new BadRequestError(
			"Security Policy: The owner of the room cannot be removed. Delete the room instead.",
		);
	}
}, "room_members");
