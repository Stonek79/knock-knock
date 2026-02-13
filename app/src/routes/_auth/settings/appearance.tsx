import { createFileRoute } from "@tanstack/react-router";
import { AppearanceSettings } from "@/features/settings/AppearanceSettings";

export const Route = createFileRoute("/_auth/settings/appearance")({
    component: AppearanceSettings,
});
