import { createFileRoute, redirect } from "@tanstack/react-router";
import { BroadcastSettings } from "@/features/settings/BroadcastSettings";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/_auth/settings/broadcast")({
    beforeLoad: () => {
        const pbUser = useAuthStore.getState().pbUser;
        if (pbUser?.role !== "admin") {
            throw redirect({ to: "/settings" });
        }
    },
    component: BroadcastSettingsPage,
});

function BroadcastSettingsPage() {
    return <BroadcastSettings />;
}
