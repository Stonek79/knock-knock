import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { DB_TABLES } from "@/lib/constants";
import { decryptMessage } from "@/lib/crypto/messages";
import { logger } from "@/lib/logger";
import { isMock, supabase } from "@/lib/supabase";
import type {
	DecryptedMessageWithProfile,
	MessageRow,
} from "@/lib/types/message";

/**
 * Хук для загрузки сообщений и подписки на обновления.
 * Автоматически расшифровывает входящие сообщения.
 */
export function useMessages(roomId: string, roomKey?: CryptoKey) {
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: ["messages", roomId],
		queryFn: async (): Promise<DecryptedMessageWithProfile[]> => {
			if (!roomId || !roomKey) return [];

			const { data, error } = await supabase
				.from(DB_TABLES.MESSAGES)
				.select("*, profiles(display_name, avatar_url)")
				.eq("room_id", roomId)
				.order("created_at", { ascending: true });

			if (error) throw error;

			const decrypted: DecryptedMessageWithProfile[] = [];
			// Используем утверждение типа для данных из Supabase
			// В реальном проекте лучше использовать генерируемые типы Supabase
			const rows = data as unknown as (MessageRow & {
				profiles: { display_name: string; avatar_url: string | null } | null;
			})[];

			for (const msg of rows) {
				if (isMock) {
					// В моке контент не зашифрован
					decrypted.push({ ...msg, content: msg.content });
					continue;
				}
				try {
					const content = await decryptMessage(msg.content, msg.iv, roomKey);
					decrypted.push({ ...msg, content });
				} catch (e) {
					logger.error(`Failed to decrypt message ${msg.id}`, e);
					decrypted.push({ ...msg, content: "🔒 Decryption failed" });
				}
			}
			return decrypted;
		},
		enabled: !!roomId && !!roomKey,
	});

	useEffect(() => {
		if (!roomId || !roomKey) return;
		const channel = supabase
			.channel(`room:${roomId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: DB_TABLES.MESSAGES,
					filter: `room_id=eq.${roomId}`,
				},
				async (payload) => {
					// При создании сообщения join не происходит, профиль может отсутствовать сразу
					// В реальном приложении лучше делать fetch по id или оптимистично добавлять
					const newMsgRaw = payload.new as MessageRow;
					// Пока мокаем профиль как null или дозапрашиваем. Для простоты типа:
					const newMsg = { ...newMsgRaw, profiles: null };

					queryClient.setQueryData(
						["messages", roomId],
						(old: DecryptedMessageWithProfile[] | undefined) => {
							if (!old) return [newMsg];
							if (old.some((m) => m.id === newMsg.id)) return old;
							return [...old, newMsg];
						},
					);
					if (isMock) return;
					try {
						const content = await decryptMessage(
							newMsg.content,
							newMsg.iv,
							roomKey,
						);
						queryClient.setQueryData(
							["messages", roomId],
							(old: DecryptedMessageWithProfile[] | undefined) =>
								old?.map((m) => (m.id === newMsg.id ? { ...m, content } : m)),
						);
					} catch (e) {
						logger.error(`Failed to decrypt realtime message ${newMsg.id}`, e);
					}
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [roomId, roomKey, queryClient]);

	return query;
}
