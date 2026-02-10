import { createFileRoute } from "@tanstack/react-router";
import { PrivacySettings } from "@/features/settings/PrivacySettings";

export const Route = createFileRoute("/settings/privacy")({
    component: PrivacySettings,
});
