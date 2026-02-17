/**
 * Тесты для стора ChatRoomStore.
 *
 * Проверяет:
 * - toggleSelection корректно выделяет/снимает выделение
 * - updateCanEdit корректно учитывает userId (владение сообщением)
 */

import { describe, expect, it } from "vitest";
import type { DecryptedMessageWithProfile } from "@/lib/types/message";
import { createChatRoomStore } from "./createStore";

// Хелпер для создания фейковых сообщений
const createMsg = (
    id: string,
    senderId: string,
    content = "text",
): DecryptedMessageWithProfile => ({
    id,
    sender_id: senderId,
    content,
    created_at: new Date().toISOString(),
    is_edited: false,
    profiles: { display_name: "User", avatar_url: null },
    room_id: "room-1",
    status: "sent",
    iv: "iv",
    deleted_by: [],
    is_deleted: false,
    is_starred: false,
});

describe("ChatRoomStore", () => {
    it("toggleSelection выделяет сообщение", () => {
        const store = createChatRoomStore();
        const msg1 = createMsg("1", "user1");

        store.getState().toggleSelection("1", [msg1], "user1");

        expect(store.getState().selectedMessageIds.has("1")).toBe(true);
        expect(store.getState().selectedMessageIds.size).toBe(1);
    });

    it("toggleSelection снимает выделение", () => {
        const store = createChatRoomStore();
        const msg1 = createMsg("1", "user1");

        store.getState().toggleSelection("1", [msg1], "user1");
        store.getState().toggleSelection("1", [msg1], "user1");

        expect(store.getState().selectedMessageIds.has("1")).toBe(false);
        expect(store.getState().selectedMessageIds.size).toBe(0);
    });

    it("canEditSelected = true если сообщение свое и выделено одно", () => {
        const store = createChatRoomStore();
        const msg1 = createMsg("1", "myself");

        // Выделяем своё сообщение
        store.getState().toggleSelection("1", [msg1], "myself");

        expect(store.getState().canEditSelected).toBe(true);
    });

    it("canEditSelected = false если сообщение чужое", () => {
        const store = createChatRoomStore();
        const msg1 = createMsg("1", "other");

        // Выделяем чужое сообщение
        store.getState().toggleSelection("1", [msg1], "myself");

        expect(store.getState().canEditSelected).toBe(false);
    });

    it("canEditSelected = false если выделено несколько", () => {
        const store = createChatRoomStore();
        const msg1 = createMsg("1", "myself");
        const msg2 = createMsg("2", "myself");
        const messages = [msg1, msg2];

        store.getState().toggleSelection("1", messages, "myself");
        store.getState().toggleSelection("2", messages, "myself");

        expect(store.getState().selectedMessageIds.size).toBe(2);
        expect(store.getState().canEditSelected).toBe(false);
    });

    it("canEditSelected обновляется при переключении", () => {
        const store = createChatRoomStore();
        const myMsg = createMsg("1", "myself");
        const otherMsg = createMsg("2", "other");
        const messages = [myMsg, otherMsg];

        // 1. Выделяем своё -> true
        store.getState().toggleSelection("1", messages, "myself");
        expect(store.getState().canEditSelected).toBe(true);

        // 2. Снимаем выделение -> false
        store.getState().toggleSelection("1", messages, "myself");
        expect(store.getState().canEditSelected).toBe(false);

        // 3. Выделяем чужое -> false
        store.getState().toggleSelection("2", messages, "myself");
        expect(store.getState().canEditSelected).toBe(false);
    });
});
