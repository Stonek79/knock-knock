import type { Room } from "@/lib/types/room";
import { MOCK_USERS } from "../data";
import { MOCK_STATE, saveMockState } from "../state";
import type { QueryHandler, QueryState } from "./types";

export const handleRoomsQuery: QueryHandler<Room> = async (
	state: QueryState,
) => {
	let data = [...MOCK_STATE.rooms];

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
		MOCK_STATE.rooms = MOCK_STATE.rooms.filter(
			(r) => !data.some((del) => del.id === r.id),
		);
		saveMockState(MOCK_STATE);
		return { data: null, error: null };
	}

	// 3. Update
	if (state.operation === "update" && state.updateValues) {
		const updates = state.updateValues;
		MOCK_STATE.rooms = MOCK_STATE.rooms.map((r) =>
			data.some((item) => item.id === r.id) ? { ...r, ...updates } : r,
		);
		saveMockState(MOCK_STATE);
		return { data: null, error: null };
	}

	// 4. Insert
	if (state.operation === "insert" && state.updateValues) {
		const newVal = state.updateValues as unknown as Room;
		MOCK_STATE.rooms.push(newVal);
		saveMockState(MOCK_STATE);
		return { data: newVal, error: null };
	}

	// 5. Join Room Members (Mock specific logic for useChatList)
	const enrichedData = data.map((room) => {
		const members = MOCK_STATE.members
			.filter((m) => m.room_id === room.id)
			.map((m) => ({
				...m,
				profiles: MOCK_USERS.find((u) => u.id === m.user_id) || null,
			}));
		return { ...room, room_members: members };
	});

	// 6. Order
	// ... basic logic if needed

	// 7. Limit & Single
	let resultData = enrichedData;
	if (state.limit) {
		resultData = resultData.slice(0, state.limit);
	}

	if (state.single) {
		return resultData.length > 0
			? { data: resultData[0] as unknown as Room, error: null }
			: { data: null, error: { message: "Room not found", code: "PGRST116" } };
	}

	return { data: resultData as unknown as Room[], error: null };
};
