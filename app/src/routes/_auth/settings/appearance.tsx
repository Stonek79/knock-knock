import { createFileRoute } from "@tanstack/react-router";
import { AppearanceSettingsPage } from "@/pages/AppearanceSettingsPage";

export const Route = createFileRoute("/_auth/settings/appearance")({
    component: AppearanceSettingsPage,
});
