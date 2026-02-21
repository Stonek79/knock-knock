import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouteErrorFallback } from "@/components/ui/Error/RouteErrorFallback";
import { SectionLoader } from "@/components/ui/SectionLoader";
import { DOM_ROOT_ID } from "@/lib/constants";
import "./lib/i18n";
import "./index.css";

// Импортируем сгенерированное дерево маршрутов
import { routeTree } from "./routeTree.gen";
import { useThemeStore } from "./stores/theme";

/** Создаем новый экземпляр роутера с глобальными defaults */
const router = createRouter({
    routeTree,
    defaultPendingComponent: SectionLoader,
    defaultErrorComponent: RouteErrorFallback,
    defaultPendingMs: 1000,
    defaultPendingMinMs: 500,
});

/** Регистрируем экземпляр роутера для безопасности типов */
declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

/** Клиент для TanStack Query */
const queryClient = new QueryClient();

/**
 * Корневой компонент приложения.
 * Управляет темами через data-theme и data-mode
 */
function Root() {
    const { theme, mode } = useThemeStore();

    return (
        <div data-theme={theme} data-mode={mode} className="knock-root">
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        </div>
    );
}

/**
 * Инициализация React-приложения.
 */
const rootElement = document.getElementById(DOM_ROOT_ID);

if (rootElement && !rootElement.innerHTML) {
    const root = createRoot(rootElement);
    root.render(
        <StrictMode>
            <Root />
        </StrictMode>,
    );
}
