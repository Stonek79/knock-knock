import { createFileRoute } from "@tanstack/react-router";
import { ProfileSettingsPage } from "@/pages/ProfileSettingsPage";

export const Route = createFileRoute("/_auth/settings/profile")({
    component: ProfileSettingsPage,
});
