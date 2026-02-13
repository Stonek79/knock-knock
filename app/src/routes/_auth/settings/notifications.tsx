import { createFileRoute } from "@tanstack/react-router";
import { NotificationSettings } from "@/features/settings/NotificationSettings";

export const Route = createFileRoute("/_auth/settings/notifications")({
    component: NotificationSettings,
});
