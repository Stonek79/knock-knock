import { useParams } from "@tanstack/react-router";
import { ChatRoom } from "@/features/chat/room";

export function ChatRoomPage() {
    const { roomId } = useParams({ strict: false });

    if (!roomId) {
        return null;
    }

    return <ChatRoom roomId={roomId} />;
}
