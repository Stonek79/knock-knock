import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ChatRealtimeService } from "@/lib/services/chat-realtime";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/_auth")({
    beforeLoad: ({ context }) => {
        const { pbUser } = useAuthStore.getState();
        if (pbUser) {
            ChatRealtimeService.init(context.queryClient, pbUser);
        }
    },
    component: AuthLayout,
});
