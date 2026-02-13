import { createFileRoute } from "@tanstack/react-router";
import { SettingsIndexPage } from "@/pages/SettingsIndexPage";

export const Route = createFileRoute("/_auth/settings/")({
    component: SettingsIndexPage,
});
