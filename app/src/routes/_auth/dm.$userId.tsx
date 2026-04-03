import { createFileRoute } from "@tanstack/react-router";
import { DirectChatPage, validateDMSearch } from "@/pages/DirectChatPage";

export const Route = createFileRoute("/_auth/dm/$userId")({
    component: DirectChatPage,
    validateSearch: validateDMSearch,
});
