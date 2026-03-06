import { createFileRoute } from "@tanstack/react-router";
import { StorageSettings } from "@/features/settings/StorageSettings";

export const Route = createFileRoute("/_auth/settings/storage")({
    component: StorageSettings,
});
