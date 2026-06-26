import { createFileRoute, redirect } from "@tanstack/react-router";
import { BroadcastPage } from "@/pages/BroadcastPage";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/_auth/admin/broadcast")({
    beforeLoad: () => {
        const pbUser = useAuthStore.getState().pbUser;
        if (pbUser?.role !== "admin") {
            throw redirect({ to: "/settings" });
        }
    },
    component: BroadcastPage,
});
