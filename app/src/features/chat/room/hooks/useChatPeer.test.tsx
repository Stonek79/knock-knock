import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES, ROOM_TYPE } from "@/lib/constants";
import { userService } from "@/lib/services/user";
import { appError, err, ok } from "@/lib/utils/result";
import { useChatPeer } from "./useChatPeer";

vi.mock("@/lib/services/user", () => ({
    userService: {
        getPeerProfile: vi.fn(),
    },
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

describe("useChatPeer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("сохраняет успешное отсутствие доступного собеседника как null", async () => {
        vi.mocked(userService.getPeerProfile).mockResolvedValue(ok(null));

        const { result } = renderHook(
            () => useChatPeer("peer-id", ROOM_TYPE.DIRECT),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it("передаёт ошибку контактов в React Query", async () => {
        const error = appError(
            ERROR_CODES.NETWORK_ERROR,
            "Контакты недоступны",
        );
        vi.mocked(userService.getPeerProfile).mockResolvedValue(err(error));

        const { result } = renderHook(
            () => useChatPeer("peer-id", ROOM_TYPE.DIRECT),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toEqual(error);
    });
});
