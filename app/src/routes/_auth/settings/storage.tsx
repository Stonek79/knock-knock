import { createFileRoute } from "@tanstack/react-router";
import { StorageSettingsPage } from "@/pages/StorageSettingsPage";

export const Route = createFileRoute("/_auth/settings/storage")({
    component: StorageSettingsPage,
});
