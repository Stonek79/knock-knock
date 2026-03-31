import { beforeAll, describe, expect, it } from "vitest";
import { cleanupDatabase } from "@/test/helpers/db-cleanup";
import { DB_FIELDS } from "../constants/db";
import { pb } from "../pocketbase";
import { mediaRepository } from "./media.repository";

/**
 * Интеграционный тест MediaRepository.
 * Проверяет реальное взаимодействие с PocketBase.
 */
describe("MediaRepository: Integration", () => {
    // Перед тестами чистим старые тестовые данные
    beforeAll(async () => {
        await cleanupDatabase();

        // Авторизация под тестовым пользователем (SEED)
        //user1@example.com / password123
        try {
            await pb
                .collection("users")
                .authWithPassword("user1@example.com", "password123");
        } catch (e) {
            console.error(
                "❌ Ошибка авторизации для интеграционного теста. Убедитесь, что SEED запущен.",
                e,
            );
        }
    });

    it("должен успешно загружать файл в PocketBase", async () => {
        // Создаем тестовый Blob
        const blob = new Blob(["test-integration-content"], {
            type: "text/plain",
        });
        const formData = new FormData();
        formData.append("file", blob, "test-file.txt");
        formData.append(DB_FIELDS.IS_TEST, "true"); // Помечаем как тест для очистки
        formData.append("owner", pb.authStore.model?.id || "");

        const result = await mediaRepository.uploadMedia(formData);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            const record = result.value;
            expect(record.id).toBeDefined();
            expect(record.file).toContain("test-file");

            // Проверяем получение URL
            const url = mediaRepository.getFileUrl(record, record.file);
            expect(url).toContain(record.id);
        }
    });
});
