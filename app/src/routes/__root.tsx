import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { NotFoundComponent } from "@/components/common/NotFound";
import { RootLayout } from "@/layouts/RootLayout";

export const Route = createRootRouteWithContext<{
    queryClient: QueryClient;
}>()({
    component: RootLayout,
    notFoundComponent: NotFoundComponent,
});
