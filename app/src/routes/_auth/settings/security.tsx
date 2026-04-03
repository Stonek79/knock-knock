import { createFileRoute } from "@tanstack/react-router";
import { SecuritySettingsPage } from "@/pages/SecuritySettingsPage";

export const Route = createFileRoute("/_auth/settings/security")({
    component: SecuritySettingsPage,
});
