import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useUnreadCounts } from "@/features/chat/list";
import type { UnreadCount } from "@/lib/types";
import { ok } from "@/lib/utils/result";

// Обёртка для QueryClient
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

// Мокаем сервис вместо прямого pb.collection.
// Используем partial mock через importOriginal: `queries` пере-экспортируется через
// `room/index.ts` (findOrCreateDM, getChatRoomData, ...), поэтому замена модуля
// заглушке без них ломала загрузку `useCreateDM`. Сохраняем все реальные экспорты и
// переопределяем только тот seam, который тест управляет: getRoomUnreadCounts.
vi.mock("@/lib/services/room/queries", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("@/lib/services/room/queries")>();
    return {
        ...actual,
        getRoomUnreadCounts: vi.fn(),
    };
});

vi.mock("@/stores/auth", () => ({
    useAuthStore: () => ({
        pbUser: { id: "test-user-id" },
    }),
}));

// Импортируем замоканный модуль для управления ответами
const { getRoomUnreadCounts } = await import("@/lib/services/room/queries");

describe("Хук useUnreadCounts", () => {
    it("загружает начальные значения через сервис", async () => {
        // Подготовка мока — возвращаем Result<UnreadCount[]>
        const mockCounts: UnreadCount[] = [{ room: "room-1", count: 5 }];

        vi.mocked(getRoomUnreadCounts).mockResolvedValue(ok(mockCounts));

        const { result } = renderHook(() => useUnreadCounts(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.getCount("room-1")).toBe(5);
        });

        expect(result.current.getCount("room-2")).toBe(0);
    });

    it("корректно обрабатывает пустой ответ", async () => {
        vi.mocked(getRoomUnreadCounts).mockResolvedValue(ok([]));

        const { result } = renderHook(() => useUnreadCounts(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.counts).toEqual([]);
        });
    });
});
