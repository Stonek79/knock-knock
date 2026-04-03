import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { NotFoundComponent } from "@/pages/NotFoundPage";
import { RootLayout } from "@/pages/RootLayoutPage";

export const Route = createRootRouteWithContext<{
    queryClient: QueryClient;
}>()({
    component: RootLayout,
    notFoundComponent: NotFoundComponent,
});
