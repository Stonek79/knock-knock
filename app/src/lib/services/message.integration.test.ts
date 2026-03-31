import { beforeAll, describe, expect, it } from "vitest";
import { cleanupDatabase } from "@/test/helpers/db-cleanup";
import { MessageService } from "./message";

describe("MessageService: Интеграционные тесты (Staging)", () => {
    // Перед всеми тестами очищаем базу
    beforeAll(async () => {
        await cleanupDatabase();
    });

    it("должен отправлять сообщение в реальную базу данных", async () => {
        // Тестовый ID пользователя
        const testUserId = "00000000-0000-0000-0000-000000000001";

        // Убеждаемся, что мы не в мок-режиме
        expect(import.meta.env.VITE_USE_MOCK).toBe("false");

        // Попытка отправки (ожидаем ошибку внешнего ключа, так как комнаты нет,
        // но это подтверждает запрос к реальному Postgres)
        const result = await MessageService.sendMessage({
            roomId: "non-existent-room-uuid",
            senderId: testUserId,
            content: "Привет, Staging!",
            roomKey: null as unknown as CryptoKey,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            // Проверяем тип ошибки
            expect(result.error).toBe("db-error");
        }
    });
});
