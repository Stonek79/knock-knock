import { createFileRoute } from "@tanstack/react-router";
import { AdminLayoutPage } from "@/pages/AdminLayoutPage";

export const Route = createFileRoute("/_auth/admin")({
    component: AdminLayoutPage,
});
