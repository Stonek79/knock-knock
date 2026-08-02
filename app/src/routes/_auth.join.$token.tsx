import { createFileRoute } from "@tanstack/react-router";
import { JoinPage } from "@/pages/JoinPage";

export const Route = createFileRoute("/_auth/join/$token")({
    component: JoinPage,
});
