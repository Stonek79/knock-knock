import { useState } from "react";
import { CHAT_TYPE } from "@/lib/constants";

/**
 * Hook for managing Test Tools (Admin Panel).
 * Handles dialog states and chat type selection.
 */
export function useTestTools() {
	const [isGroupOpen, setIsGroupOpen] = useState(false);
	const [isChatOpen, setIsChatOpen] = useState(false);
	const [chatType, setChatType] = useState<
		(typeof CHAT_TYPE)[keyof typeof CHAT_TYPE]
	>(CHAT_TYPE.PUBLIC);

	const openCreateChat = (type: (typeof CHAT_TYPE)[keyof typeof CHAT_TYPE]) => {
		setChatType(type);
		setIsChatOpen(true);
	};

	return {
		isGroupOpen,
		setIsGroupOpen,
		isChatOpen,
		setIsChatOpen,
		chatType,
		openCreateChat,
	};
}
