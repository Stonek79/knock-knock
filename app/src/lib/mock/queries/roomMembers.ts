import { MOCK_USERS } from "../data";
import { MOCK_STATE, type MockMember, saveMockState } from "../state";
import type { QueryHandler, QueryState } from "./types";

// Тип для room_member
interface RoomMember {
	room_id: string;
	user_id: string;
	role: string;
	joined_at: string;
	last_read_at?: string | null;
}

export const handleRoomMembersQuery: QueryHandler<RoomMember> = async (
	state: QueryState,
) => {
	let data = [...MOCK_STATE.members];

	// 1. Filter
	for (const filter of state.filters) {
		data = data.filter((item) => {
			const itemValue = (item as unknown as Record<string, unknown>)[
				filter.column
			];
			if (Array.isArray(filter.value)) {
				return (filter.value as unknown[]).includes(itemValue);
			}
			return itemValue === filter.value;
		});
	}

	// 2. Delete
	if (state.operation === "delete") {
		MOCK_STATE.members = MOCK_STATE.members.filter(
			(m) =>
				!data.some(
					(del) => del.room_id === m.room_id && del.user_id === m.user_id,
				),
		);
		saveMockState(MOCK_STATE);
		return { data: null, error: null };
	}

	// 3. Insert
	if (state.operation === "insert" && state.updateValues) {
		const values = Array.isArray(state.updateValues)
			? state.updateValues
			: [state.updateValues];

		// Приводим к MockMember, добавляя дефолтные значения
		const newMembers: MockMember[] = (values as RoomMember[]).map((v) => ({
			...v,
			last_read_at: v.last_read_at || new Date(0).toISOString(),
		}));

		MOCK_STATE.members.push(...newMembers);
		saveMockState(MOCK_STATE);
		return { data: values.length === 1 ? values[0] : values, error: null };
	}

	// 4. Select (Special logic for user_id filter -> get Rooms)
	const userIdFilter = state.filters.find((f) => f.column === "user_id");

	if (userIdFilter && state.operation === "select") {
		const complexData = data.map((m) => {
			const room = MOCK_STATE.rooms.find((r) => r.id === m.room_id);
			// Last msg
			const lastMsg = MOCK_STATE.messages
				.filter((msg) => msg.room_id === m.room_id)
				.sort(
					(a, b) =>
						new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
				)[0];

			// All members with profiles
			const allMembers = MOCK_STATE.members
				.filter((rm) => rm.room_id === m.room_id)
				.map((rm) => ({
					user_id: rm.user_id,
					profiles: MOCK_USERS.find((u) => u.id === rm.user_id) || null,
				}));

			return {
				...m,
				rooms: room
					? {
							...room,
							last_message: lastMsg
								? {
										content: lastMsg.content,
										created_at: lastMsg.created_at,
										sender_id: lastMsg.sender_id,
									}
								: null,
							room_members: allMembers,
						}
					: null,
			};
		});

		// Возвращаем any, так как структура сложная и специфична для этого UI-запроса
		return { data: complexData as unknown as RoomMember[], error: null };
	}

	// Обычный select
	const resultMembers = data.map((m) => ({
		...m,
		profiles: MOCK_USERS.find((u) => u.id === m.user_id) || null,
	}));

	if (state.single) {
		return resultMembers.length > 0
			? { data: resultMembers[0] as unknown as RoomMember, error: null }
			: {
					data: null,
					error: { message: "Member not found", code: "PGRST116" },
				};
	}

	return { data: resultMembers as unknown as RoomMember[], error: null };
};
