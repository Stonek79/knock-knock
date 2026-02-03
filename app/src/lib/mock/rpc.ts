import { saveMockState } from "./state";

interface MockState {
	// biome-ignore lint/suspicious/noExplicitAny: Mocking internal state
	rooms: any[];
	// biome-ignore lint/suspicious/noExplicitAny: Mocking internal state
	members: any[];
	// biome-ignore lint/suspicious/noExplicitAny: Mocking internal state
	messages: any[];
}

/**
 * Обработчик RPC вызовов для Mock-клиента.
 * Эмулирует серверную логику PostgreSQL функций.
 */
export const handleRpc = (
	fn: string,
	// biome-ignore lint/suspicious/noExplicitAny: Generic args
	args: any,
	state: MockState,
	userId: string | undefined,
	// biome-ignore lint/suspicious/noExplicitAny: Mocking internal state
	emitEvent: (event: string, payload: any) => void,
) => {
	if (fn === "get_unread_counts") {
		if (!userId) return { data: [], error: null };

		const counts = state.rooms
			// Находим комнаты, где пользователь является участником
			.filter((r) =>
				state.members.some(
					// biome-ignore lint/suspicious/noExplicitAny: Mocking internal state
					(m: any) => m.room_id === r.id && m.user_id === userId,
				),
			)
			.map((r) => {
				const member = state.members.find(
					// biome-ignore lint/suspicious/noExplicitAny: Mocking internal state
					(m: any) => m.room_id === r.id && m.user_id === userId,
				);
				// Если last_read_at отсутствует, считаем что прочитано давно (или никогда, если 0).
				// Для тестов удобно 0 (все непрочитаны).
				const lastRead = member?.last_read_at
					? new Date(member.last_read_at).getTime()
					: 0;

				const count = state.messages.filter(
					// biome-ignore lint/suspicious/noExplicitAny: Mocking internal state
					(m: any) =>
						m.room_id === r.id &&
						m.sender_id !== userId &&
						new Date(m.created_at).getTime() > lastRead,
				).length;
				return { room_id: r.id, count };
			});
		return { data: counts, error: null };
	}

	if (fn === "mark_room_as_read") {
		const { p_room_id } = args || {};
		if (userId && p_room_id) {
			let updatedMember = null;

			// Обновляем состояние
			// eslint-disable-next-line no-param-reassign
			// biome-ignore lint/suspicious/noExplicitAny: Mocking internal state
			state.members = state.members.map((m: any) => {
				if (m.room_id === p_room_id && m.user_id === userId) {
					updatedMember = { ...m, last_read_at: new Date().toISOString() };
					return updatedMember;
				}
				return m;
			});

			// Сохраняем и эмитим событие
			saveMockState(state);

			if (updatedMember) {
				emitEvent(`postgres_changes:public:room_members:user_id=eq.${userId}`, {
					eventType: "UPDATE",
					new: updatedMember,
					old: {},
				});
			}
		}
		return { data: null, error: null };
	}

	return { data: null, error: { message: `Function ${fn} not found in mock` } };
};
