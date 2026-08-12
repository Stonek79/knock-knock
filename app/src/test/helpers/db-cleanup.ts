import { DB_FIELDS, DB_TABLES } from "@/lib/constants/db";
import { pb } from "@/lib/pocketbase";

/**
 * Хелпер для очистки тестовых сущностей в базе данных.
 * Удаляет только записи, помеченные флагом `is_test: true`.
 * Это позволяет отделять временные данные тестов от стабильных сидов/дев-данных.
 *
 * ВАЖНО: Требует наличия поля `is_test` (тип bool) в схемах коллекций.
 */
export interface DatabaseCleanupPolicyInput {
    pbUrl?: string;
    allowCleanup?: string;
}

/**
 * Разрешена ли очистка данных интеграционного контура.
 *
 * Нужны оба независимых условия: явный флаг и известный test/staging endpoint.
 * Поэтому одна ошибочная переменная окружения не может включить cleanup на
 * production или на неизвестном URL.
 */
export function isDatabaseCleanupAllowed({
    pbUrl = import.meta.env.VITE_PB_URL,
    allowCleanup = import.meta.env.VITE_ALLOW_DB_CLEANUP,
}: DatabaseCleanupPolicyInput = {}): boolean {
    if (allowCleanup !== "true" || !pbUrl) {
        return false;
    }

    try {
        const hostname = new URL(pbUrl).hostname.toLowerCase();
        const isLocalTest = ["localhost", "127.0.0.1", "::1"].includes(
            hostname,
        );
        const isKnownRemoteTest = [
            "dev-api.whoami.ninja",
            "staging-api.whoami.ninja",
            "test-api.whoami.ninja",
        ].includes(hostname);

        return isLocalTest || isKnownRemoteTest;
    } catch {
        return false;
    }
}

export async function cleanupDatabase() {
    if (!isDatabaseCleanupAllowed()) {
        throw new Error(
            "⛔ КРИТИЧЕСКАЯ ОШИБКА БЕЗОПАСНОСТИ: Попытка очистки ПРОДУКТОВОЙ базы данных остановлена!",
        );
    }

    // Таблицы, которые мы проверяем на наличие тестовых данных
    const tablesToClear = [
        DB_TABLES.MESSAGES,
        DB_TABLES.ROOM_MEMBERS,
        DB_TABLES.ROOM_KEYS,
        DB_TABLES.ROOMS,
        DB_TABLES.PRESENCE_STATUS,
    ];

    console.log("🧼 Поиск и удаление тестовых сущностей (is_test=true)...");

    for (const table of tablesToClear) {
        try {
            // Ищем только записи с флагом is_test=true
            const records = await pb.collection(table).getFullList({
                filter: `${DB_FIELDS.IS_TEST} = true`,
                fields: "id",
            });

            if (records.length > 0) {
                // Удаляем пачкой
                await Promise.all(
                    records.map((r) => pb.collection(table).delete(r.id)),
                );
                console.log(
                    `✅ Таблица ${table}: удалено ${records.length} тестовых записей`,
                );
            }
        } catch (error) {
            // Если поля is_test еще нет в схеме, PocketBase вернет ошибку фильтрации
            console.warn(
                `⚠️ Пропущена таблица ${table}: возможно, поле ${DB_FIELDS.IS_TEST} еще не добавлено в схему. /n ${error}`,
            );
        }
    }
}
