import { beforeEach, describe, expect, it, vi } from "vitest";
import { GHOST_STATUS } from "@/lib/constants";
import { useGhostStore } from ".";

// Мокаем crypto.subtle для тестов в Node.js/JSDOM
if (!globalThis.crypto) {
    // biome-ignore lint/suspicious/noExplicitAny: Mocking global crypto in tests
    (globalThis as any).crypto = {} as Crypto;
}
if (!globalThis.crypto.subtle) {
    // biome-ignore lint/suspicious/noExplicitAny: Mocking crypto.subtle in tests
    (globalThis.crypto as any).subtle = {
        digest: vi.fn(async (_algo, data) => {
            // Упрощенный мок хеширования для тестов
            return new Uint8Array(data).buffer;
        }),
    };
}

describe("useGhostStore", () => {
    beforeEach(() => {
        useGhostStore.getState().disable();
        vi.clearAllMocks();
    });

    it("начальное состояние корректно", () => {
        const state = useGhostStore.getState();
        expect(state.enabled).toBe(false);
        expect(state.status).toBe(GHOST_STATUS.UNLOCKED);
        expect(state.pinHash).toBeNull();
    });

    it("установка PIN активирует Ghost Mode и блокирует приложение", async () => {
        await useGhostStore.getState().setPin("1234");

        const state = useGhostStore.getState();
        expect(state.enabled).toBe(true);
        expect(state.status).toBe(GHOST_STATUS.LOCKED);
        expect(state.pinHash).not.toBeNull();
    });

    it("корректная разблокировка основным PIN", async () => {
        await useGhostStore.getState().setPin("1234");
        const success = await useGhostStore.getState().unlock("1234");

        expect(success).toBe(true);
        expect(useGhostStore.getState().status).toBe(GHOST_STATUS.UNLOCKED);
    });

    it("разблокировка ложным PIN переводит в статус decoy", async () => {
        await useGhostStore.getState().setPin("1234");
        await useGhostStore.getState().setDecoyPin("0000");

        const success = await useGhostStore.getState().unlock("0000");

        expect(success).toBe(true);
        expect(useGhostStore.getState().status).toBe(GHOST_STATUS.DECOY);
        expect(useGhostStore.getState().isDecoy()).toBe(true);
    });

    it("неверный PIN не разблокирует приложение", async () => {
        await useGhostStore.getState().setPin("1234");
        const success = await useGhostStore.getState().unlock("1111");

        expect(success).toBe(false);
        expect(useGhostStore.getState().status).toBe(GHOST_STATUS.LOCKED);
    });

    it("функция lock переводит в состояние locked, если режим включен", async () => {
        await useGhostStore.getState().setPin("1234");
        await useGhostStore.getState().unlock("1234");
        expect(useGhostStore.getState().status).toBe(GHOST_STATUS.UNLOCKED);

        useGhostStore.getState().lock();
        expect(useGhostStore.getState().status).toBe(GHOST_STATUS.LOCKED);
    });

    it("disable полностью очищает настройки", async () => {
        await useGhostStore.getState().setPin("1234");
        await useGhostStore.getState().setDecoyPin("0000");

        useGhostStore.getState().disable();

        const state = useGhostStore.getState();
        expect(state.enabled).toBe(false);
        expect(state.pinHash).toBeNull();
        expect(state.decoyPinHash).toBeNull();
        expect(state.status).toBe(GHOST_STATUS.UNLOCKED);
    });
});
