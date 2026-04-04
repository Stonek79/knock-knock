import { createFileRoute } from "@tanstack/react-router";
import { VerifyPage } from "@/pages/VerifyPage";

export const Route = createFileRoute("/auth/verify")({
    component: VerifyPage,
    validateSearch: (search: Record<string, unknown>) => {
        return {
            token: search.token as string | undefined,
        };
    },
});
