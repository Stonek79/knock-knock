import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useUnreadCounts } from "@/features/chat/list";
import { supabase } from "@/lib/supabase";

// Wrapper for QueryClient
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

// Mock dependencies
vi.mock("@/lib/supabase", () => ({
    supabase: {
        rpc: vi.fn(),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
        })),
        removeChannel: vi.fn(),
    },
}));

vi.mock("@/stores/auth", () => ({
    useAuthStore: () => ({
        user: { id: "test-user-id" },
    }),
}));

describe("Хук useUnreadCounts", () => {
    it("загружает начальные значения через RPC", async () => {
        // Setup RPC mock
        const mockCounts = [{ room_id: "room-1", count: 5 }];
        // biome-ignore lint/suspicious/noExplicitAny: Mocking RPC
        (supabase.rpc as unknown as any).mockResolvedValue({
            data: mockCounts,
            error: null,
        });

        const { result } = renderHook(() => useUnreadCounts(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.counts).toEqual(mockCounts);
        });

        expect(result.current.getCount("room-1")).toBe(5);
        expect(result.current.getCount("room-2")).toBe(0);
    });

    it("корректно обрабатывает ошибки RPC", async () => {
        // biome-ignore lint/suspicious/noExplicitAny: Mocking RPC
        (supabase.rpc as unknown as any).mockResolvedValue({
            data: null,
            error: { message: "RPC Error" },
        });

        const { result } = renderHook(() => useUnreadCounts(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.counts).toEqual([]);
        });
    });
});
