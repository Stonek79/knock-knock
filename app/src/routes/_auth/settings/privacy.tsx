import { createFileRoute } from "@tanstack/react-router";
import { PrivacySettingsPage } from "@/pages/PrivacySettingsPage";

export const Route = createFileRoute("/_auth/settings/privacy")({
    component: PrivacySettingsPage,
});
