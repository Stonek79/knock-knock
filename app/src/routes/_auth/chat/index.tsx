import { createFileRoute } from "@tanstack/react-router";
import { ChatPlaceholder } from "@/features/chat/room";

export const Route = createFileRoute("/_auth/chat/")({
    component: ChatPlaceholder,
});
