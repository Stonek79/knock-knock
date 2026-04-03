import { createFileRoute } from "@tanstack/react-router";
import { SettingsRouteLayout } from "@/pages/SettingsLayoutPage";

export const Route = createFileRoute("/_auth/settings")({
    component: SettingsRouteLayout,
});
