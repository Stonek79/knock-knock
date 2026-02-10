import { createFileRoute } from "@tanstack/react-router";
import { IndexPage } from "@/components/routes/IndexPage";

export const Route = createFileRoute("/")({
    component: IndexPage,
});
