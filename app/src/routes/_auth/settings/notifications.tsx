import { createFileRoute } from "@tanstack/react-router";
import { NotificationSettingsPage } from "@/pages/NotificationSettingsPage";

export const Route = createFileRoute("/_auth/settings/notifications")({
    component: NotificationSettingsPage,
});
