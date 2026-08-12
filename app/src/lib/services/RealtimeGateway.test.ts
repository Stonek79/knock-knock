import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    realtimeSubscribe: vi.fn(),
    collectionSubscribe: vi.fn().mockResolvedValue(undefined),
    collectionUnsubscribe: vi.fn().mockResolvedValue(undefined),
    healthCheck: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/pocketbase", () => ({
    pb: {
        realtime: {
            isConnected: false,
            onDisconnect: null,
            subscribe: mocks.realtimeSubscribe,
        },
        health: {
            check: mocks.healthCheck,
        },
        collection: vi.fn(() => ({
            subscribe: mocks.collectionSubscribe,
            unsubscribe: mocks.collectionUnsubscribe,
        })),
    },
}));

describe("RealtimeGateway module seam", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("does not open a realtime subscription while the module is imported", async () => {
        await import("./RealtimeGateway");

        expect(mocks.realtimeSubscribe).not.toHaveBeenCalled();
    });

    it("initializes connection listeners on the first collection subscription", async () => {
        const { realtimeGateway } = await import("./RealtimeGateway");

        await realtimeGateway.subscribe("messages", () => {});

        expect(mocks.realtimeSubscribe).toHaveBeenCalledWith(
            "PB_CONNECT",
            expect.any(Function),
        );
        expect(mocks.collectionSubscribe).toHaveBeenCalledWith(
            "*",
            expect.any(Function),
        );
    });
});
