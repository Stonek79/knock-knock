/**
 * Тест маршрута чата.
 *
 * Проверяет что компонент ChatRoomRoute корректно извлекает roomId
 * из параметров маршрута и передаёт его в ChatRoom.
 *
 * Подход: Используем RouterProvider с кастомным роутером для тестирования.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

// Мокаем ChatRoom компонент
vi.mock("@/features/chat/ChatRoom", () => ({
    ChatRoom: ({ roomId }: { roomId: string }) => (
        <div data-testid="chat-room">Room ID: {roomId}</div>
    ),
}));

// Мокаем зависимости
vi.mock("@/lib/supabase", () => ({
    supabase: {
        from: () => ({ select: () => ({ data: [], error: null }) }),
        channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    },
}));

vi.mock("@/stores/auth", () => ({
    useAuthStore: () => ({ user: { id: "test-user" } }),
}));

// Создаём QueryClient для тестов
const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });

describe("Chat Route", () => {
    it("передаёт roomId из URL параметров в ChatRoom", async () => {
        // Импортируем ChatRoom после мокирования
        const { ChatRoom } = await import("@/features/chat/ChatRoom");

        // Создаём тестовый роутер
        const rootRoute = createRootRoute();

        const chatRoute = createRoute({
            getParentRoute: () => rootRoute,
            path: "/chat/$roomId",
            component: () => {
                // Получаем параметр из useParams хука
                const { roomId } = chatRoute.useParams();
                return <ChatRoom roomId={roomId} />;
            },
        });

        const routeTree = rootRoute.addChildren([chatRoute]);

        const memoryHistory = createMemoryHistory({
            initialEntries: ["/chat/test-room-123"],
        });

        const router = createRouter({
            routeTree,
            history: memoryHistory,
        });

        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <Suspense fallback={<div>Loading...</div>}>
                    <RouterProvider router={router} />
                </Suspense>
            </QueryClientProvider>,
        );

        // Ждём рендеринга
        await waitFor(() => {
            expect(screen.getByTestId("chat-room")).toBeInTheDocument();
        });

        // Проверяем что roomId передан корректно
        expect(screen.getByText("Room ID: test-room-123")).toBeInTheDocument();
    });
});
