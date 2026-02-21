import type { Message } from "@/lib/types/message";
import { MOCK_USERS } from "../data";
import { mockEE } from "../realtime";
import { MOCK_STATE, saveMockState } from "../state";
import type { QueryHandler, QueryState } from "./types";

export const handleMessagesQuery: QueryHandler<Message> = async (
	state: QueryState,
) => {
	let data = [...MOCK_STATE.messages];

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
		MOCK_STATE.messages = MOCK_STATE.messages.filter(
			(m) => !data.some((del) => del.id === m.id),
		);
		saveMockState(MOCK_STATE);
		return { data: null, error: null };
	}

	// 3. Update
	if (state.operation === "update" && state.updateValues) {
		const updates = state.updateValues;

		MOCK_STATE.messages = MOCK_STATE.messages.map((msg) => {
			if (data.some((item) => item.id === msg.id)) {
				const updatedMsg = { ...msg, ...updates };

				// Realtime Event
				mockEE.emit(
					`postgres_changes:public:messages:room_id=eq.${msg.room_id}`,
					{
						eventType: "UPDATE",
						new: {
							...updatedMsg,
							profiles: MOCK_USERS.find((u) => u.id === msg.sender_id) || null,
						},
						old: msg,
					},
				);
				return updatedMsg;
			}
			return msg;
		});

		saveMockState(MOCK_STATE);
		return { data: null, error: null };
	}

	// 4. Insert
	if (state.operation === "insert" && state.updateValues) {
		// Handle array insert
		const values = Array.isArray(state.updateValues)
			? state.updateValues
			: [state.updateValues];

		const insertedMessages: Message[] = [];

		values.forEach((val: Record<string, unknown>) => {
			const newMsg = {
				...val,
				id: (val.id as string) || Math.random().toString(36).substring(7),
				created_at: (val.created_at as string) || new Date().toISOString(),
				// Ensure defaults for required fields
				content: (val.content as string) || null,
				sender_id: (val.sender_id as string) || null,
				is_deleted: !!val.is_deleted,
				is_edited: !!val.is_edited,
				is_starred: !!val.is_starred,
				deleted_by: (val.deleted_by as string[]) || [],
			} as unknown as Message;

			// Type check happens at runtime via Zod in real app, here we assume it's valid
			insertedMessages.push(newMsg);

			// Push to Mock State (MockMessage allows null sender_id now)
			MOCK_STATE.messages.push(newMsg);

			// Realtime Event
			if (newMsg.room_id) {
				mockEE.emit(
					`postgres_changes:public:messages:room_id=eq.${newMsg.room_id}`,
					{
						eventType: "INSERT",
						new: {
							...newMsg,
							profiles: newMsg.sender_id
								? MOCK_USERS.find((u) => u.id === newMsg.sender_id) || null
								: null,
						},
					},
				);
			}
		});

		saveMockState(MOCK_STATE);

		return {
			data:
				insertedMessages.length === 1 ? insertedMessages[0] : insertedMessages,
			error: null,
		};
	}

	// 5. Select (Enrich with profiles)
	const enrichedData = data.map((msg) => ({
		...msg,
		profiles: msg.sender_id
			? MOCK_USERS.find((u) => u.id === msg.sender_id) || null
			: null,
	}));

	let resultData = enrichedData;

	// 6. Order
	if (state.order) {
		const { column, options } = state.order;
		resultData.sort((a, b) => {
			const valA = (a as unknown as Record<string, unknown>)[column];
			const valB = (b as unknown as Record<string, unknown>)[column];
			if ((valA as number) < (valB as number))
				return options?.ascending ? -1 : 1;
			if ((valA as number) > (valB as number))
				return options?.ascending ? 1 : -1;
			return 0;
		});
	}

	// 7. Limit
	if (state.limit) {
		resultData = resultData.slice(0, state.limit);
	}

	// 8. Single
	if (state.single) {
		return resultData.length > 0
			? { data: resultData[0] as unknown as Message, error: null }
			: {
					data: null,
					error: { message: "Message not found", code: "PGRST116" },
				};
	}

	return { data: resultData as unknown as Message[], error: null };
};
