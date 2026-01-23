import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import './lib/i18n';
import './index.css';

// Импортируем сгенерированное дерево маршрутов
import { routeTree } from './routeTree.gen';

/** Создаем новый экземпляр роутера */
const router = createRouter({ routeTree });

/** Регистрируем экземпляр роутера для безопасности типов */
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}

/** Клиент для TanStack Query */
const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (rootElement && !rootElement.innerHTML) {
    const root = createRoot(rootElement);
    root.render(
        <StrictMode>
            <Theme accentColor="blue" grayColor="slate" radius="medium">
                <QueryClientProvider client={queryClient}>
                    <RouterProvider router={router} />
                </QueryClientProvider>
            </Theme>
        </StrictMode>,
    );
}
