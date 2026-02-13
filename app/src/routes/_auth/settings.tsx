import { createFileRoute } from "@tanstack/react-router";
import { SettingsRouteLayout } from "@/layouts/SettingsRouteLayout";

export const Route = createFileRoute("/_auth/settings")({
    component: SettingsRouteLayout,
});
