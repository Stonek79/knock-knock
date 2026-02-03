import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEYS } from "@/lib/constants/chat";
import type { DecryptedMessageWithProfile } from "@/lib/types/message";

export function useUnreadTracking(
	roomId: string,
	messages: DecryptedMessageWithProfile[],
) {
	const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
	const [unreadCount, setUnreadCount] = useState(0);
	const initialized = useRef(false);

	// Load unread state on mount (or when messages first load)
	useEffect(() => {
		if (!roomId || messages.length === 0 || initialized.current) return;

		try {
			const storage = localStorage.getItem(STORAGE_KEYS.CHAT_LAST_VIEWED);
			const data = storage ? JSON.parse(storage) : {};
			const lastViewedAt = data[roomId];

			if (lastViewedAt) {
				const unread = messages.filter(
					(m) => new Date(m.created_at).getTime() > lastViewedAt,
				);
				if (unread.length > 0) {
					setFirstUnreadId(unread[0].id);
					setUnreadCount(unread.length);
				}
			}
			initialized.current = true;
		} catch (e) {
			console.error("Failed to parse local storage for unread tracking", e);
		}
	}, [roomId, messages]);

	// Mark as read (save timestamp)
	const markAsRead = useCallback(() => {
		try {
			const storage = localStorage.getItem(STORAGE_KEYS.CHAT_LAST_VIEWED);
			const data = storage ? JSON.parse(storage) : {};
			data[roomId] = Date.now();
			localStorage.setItem(STORAGE_KEYS.CHAT_LAST_VIEWED, JSON.stringify(data));
			setFirstUnreadId(null);
			setUnreadCount(0);
		} catch (e) {
			console.error("Failed to save read status", e);
		}
	}, [roomId]);

	return {
		firstUnreadId,
		unreadCount,
		markAsRead,
	};
}
