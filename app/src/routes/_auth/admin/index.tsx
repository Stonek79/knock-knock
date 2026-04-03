import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";

export const Route = createFileRoute("/_auth/admin/")({
    component: AdminDashboardPage,
});
