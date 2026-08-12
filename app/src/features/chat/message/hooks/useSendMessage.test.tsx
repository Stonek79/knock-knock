import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { outboxDb } from "@/lib/mediadb/media-db";
import { pb } from "@/lib/pocketbase";
import { useSendMessage } from "./useSendMessage";

vi.mock("@/lib/mediadb/media-db", () => ({
    outboxDb: { add: vi.fn() },
}));

vi.mock("@/lib/pocketbase", () => ({
    pb: { authStore: { token: "session-token" } },
}));

vi.mock("@/lib/logger", () => ({
    logger: { error: vi.fn() },
}));

vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

const user = { id: "user-1", display_name: "Test User" };
const syncRegister = vi.fn().mockResolvedValue(undefined);

describe("useSendMessage offline outbox", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        syncRegister.mockClear();
        Object.defineProperty(navigator, "onLine", {
            configurable: true,
            value: false,
        });
        vi.stubGlobal("crypto", { randomUUID: () => "outbox-1" });
        vi.stubGlobal("SyncManager", function SyncManager() {});
        Object.defineProperty(navigator, "serviceWorker", {
            configurable: true,
            value: {
                ready: Promise.resolve({
                    sync: { register: syncRegister },
                }),
            },
        });
    });

    it("сохраняет offline-сообщение в Outbox и регистрирует sync", async () => {
        const queryClient = new QueryClient();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
                <ToastProvider>{children}</ToastProvider>
            </QueryClientProvider>
        );
        const { result } = renderHook(
            () =>
                useSendMessage({
                    roomId: "room-1",
                    roomKey: {} as CryptoKey,
                    user,
                }),
            { wrapper },
        );

        await act(async () => {
            await result.current.mutateAsync({ text: "offline message" });
        });

        expect(outboxDb.add).toHaveBeenCalledWith(
            "user-1",
            expect.objectContaining({
                id: "outbox-1",
                roomId: "room-1",
                userId: "user-1",
                token: pb.authStore.token,
                status: "pending",
                retryCount: 0,
                payload: { text: "offline message" },
            }),
        );
        expect(syncRegister).toHaveBeenCalledWith("sync-outbox");
    });
});
