import { createFileRoute } from "@tanstack/react-router";
import { ChatLayout } from "@/layouts/ChatLayout";

export const Route = createFileRoute("/_auth/chat")({
    component: ChatLayout,
});
