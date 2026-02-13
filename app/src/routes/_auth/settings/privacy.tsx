import { createFileRoute } from "@tanstack/react-router";
import { PrivacySettings } from "@/features/settings/PrivacySettings";

export const Route = createFileRoute("/_auth/settings/privacy")({
    component: PrivacySettings,
});
