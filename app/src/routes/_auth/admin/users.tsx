import { createFileRoute } from "@tanstack/react-router";
import { UserList } from "@/features/admin/UserList";

export const Route = createFileRoute("/_auth/admin/users")({
    component: UserList,
});
