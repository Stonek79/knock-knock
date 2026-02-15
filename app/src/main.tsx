import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { RouteErrorFallback } from "@/components/ui/Error/RouteErrorFallback";
import { SectionLoader } from "@/components/ui/Loading/SectionLoader";
import { DESIGN_THEME, DOM_ROOT_ID, RADIX_THEME } from "@/lib/constants";
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
 * Управляет темами Radix UI и провайдерами данных.
 * Theme — единственная обёртка Radix Themes на весь проект.
 */
function Root() {
    const { theme, mode } = useThemeStore();

    // Динамически выбираем цвета Radix под нашу концепцию
    const currentRadixConfig =
        theme === DESIGN_THEME.EMERALD
            ? RADIX_THEME[DESIGN_THEME.EMERALD]
            : RADIX_THEME[DESIGN_THEME.NEON];

    return (
        <Theme
            appearance={mode}
            accentColor={currentRadixConfig.ACCENT}
            grayColor={currentRadixConfig.GRAY}
            radius={RADIX_THEME.DEFAULT_RADIUS}
            panelBackground={RADIX_THEME.DEFAULT_PANEL_BACKGROUND}
            hasBackground={false}
            data-theme={theme}
            data-mode={mode}
        >
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        </Theme>
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
