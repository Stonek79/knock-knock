import { createFileRoute } from "@tanstack/react-router";
import { BroadcastPage } from "@/pages/BroadcastPage";

export const Route = createFileRoute("/_auth/admin/broadcast")({
    component: BroadcastPage,
});
