import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { ToastProvider } from "@/components/ui/Toast";
import "./lib/i18n";
import "./index.css";

// Импортируем сгенерированное дерево маршрутов
import { routeTree } from "./routeTree.gen";
import { useThemeStore } from "./stores/theme";

/** Создаем новый экземпляр роутера */
const router = createRouter({ routeTree });

/** Регистрируем экземпляр роутера для безопасности типов */
declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

/** Клиент для TanStack Query */
const queryClient = new QueryClient();

function Root() {
    const { theme, mode } = useThemeStore();

    // Динамически выбираем акцент Radix под нашу концепцию
    // Emerald: золотой акцент (#CFA570 -> Radix 'gold' или 'amber')
    // Neon: бирюзовый акцент (#00F0FF -> Radix 'teal' или 'cyan')
    const accentColor = theme === "emerald" ? "gold" : "teal";
    const grayColor = theme === "emerald" ? "olive" : "slate";

    return (
        <Theme
            appearance={mode}
            accentColor={accentColor}
            grayColor={grayColor}
            radius="medium"
            panelBackground="translucent"
            hasBackground={false}
        >
            <QueryClientProvider client={queryClient}>
                <ToastProvider>
                    <RouterProvider router={router} />
                </ToastProvider>
            </QueryClientProvider>
        </Theme>
    );
}

const rootElement = document.getElementById("root");
if (rootElement && !rootElement.innerHTML) {
    const root = createRoot(rootElement);
    root.render(
        <StrictMode>
            <Root />
        </StrictMode>,
    );
}
