import { createFileRoute } from "@tanstack/react-router";
import { PrivateChatPage } from "@/pages/PrivateChatPage";

export const Route = createFileRoute("/_auth/private/")({
    component: PrivateChatPage,
});
