import { createFileRoute } from "@tanstack/react-router";
import { DMInitializer } from "@/features/chat/DMInitializer";
import { validateDMSearch } from "@/features/chat/DMInitializer/dm.schema";

export const Route = createFileRoute("/_auth/dm/$userId")({
    component: DMInitializer,
    validateSearch: validateDMSearch,
});
