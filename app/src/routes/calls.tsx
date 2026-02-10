import { createFileRoute } from "@tanstack/react-router";
import { CallsPage } from "@/pages/CallsPage";

export const Route = createFileRoute("/calls")({
    component: CallsPage,
});
