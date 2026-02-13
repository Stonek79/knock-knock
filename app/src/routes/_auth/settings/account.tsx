import { createFileRoute } from "@tanstack/react-router";
import { AccountSettings } from "@/features/settings/AccountSettings";

export const Route = createFileRoute("/_auth/settings/account")({
    component: AccountSettings,
});
