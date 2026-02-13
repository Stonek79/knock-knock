import { createFileRoute } from "@tanstack/react-router";
import { ChatRoomPage } from "@/pages/ChatRoomPage";

export const Route = createFileRoute("/_auth/chat/$roomId")({
    component: ChatRoomPage,
});
