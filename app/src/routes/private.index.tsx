import { createFileRoute } from "@tanstack/react-router";
import { PrivateChatPage } from "@/pages/PrivateChatPage";

export const Route = createFileRoute("/private/")({
    component: PrivateChatPage,
});
