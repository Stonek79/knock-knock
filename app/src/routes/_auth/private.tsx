import { createFileRoute } from "@tanstack/react-router";
import { PrivateLayout } from "@/layouts/PrivateLayout";

export const Route = createFileRoute("/_auth/private")({
    component: PrivateLayout,
});
