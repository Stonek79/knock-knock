import { createFileRoute } from "@tanstack/react-router";
import { CallsPage } from "@/pages/CallsPage";

export const Route = createFileRoute("/_auth/calls")({
    component: CallsPage,
});
