import { createFileRoute } from "@tanstack/react-router";
import { ChatMainPage } from "@/pages/ChatMainPage";

export const Route = createFileRoute("/_auth/chat/")({
    component: ChatMainPage,
});
