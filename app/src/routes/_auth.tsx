import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/pages/AuthLayoutPage";

export const Route = createFileRoute("/_auth")({
    component: AuthLayout,
});
