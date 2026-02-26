import { createFileRoute } from "@tanstack/react-router";
import { DMInitializer, validateDMSearch } from "@/features/chat/room";

export const Route = createFileRoute("/_auth/dm/$userId")({
    component: DMInitializer,
    validateSearch: validateDMSearch,
});
