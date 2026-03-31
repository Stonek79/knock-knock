import { DB_FIELDS, DB_TABLES } from "@/lib/constants/db";
import { pb } from "@/lib/pocketbase";

/**
 * Хелпер для очистки тестовых сущностей в базе данных.
 * Удаляет только записи, помеченные флагом `is_test: true`.
 * Это позволяет отделять временные данные тестов от стабильных сидов/дев-данных.
 *
 * ВАЖНО: Требует наличия поля `is_test` (тип bool) в схемах коллекций.
 */
export async function cleanupDatabase() {
    const pbUrl = import.meta.env.VITE_PB_URL;

    // 🛡 ЗАЩИТА 1: Не позволяем чистить базу, если URL похож на продуктовый
    // Но разрешаем, если есть явный флаг VITE_ALLOW_DB_CLEANUP=true
    const isProdUrl =
        pbUrl?.includes("api.knok-knok.ru") && !pbUrl?.includes("staging");
    const isCleanupAllowed = import.meta.env.VITE_ALLOW_DB_CLEANUP === "true";

    if (isProdUrl && !isCleanupAllowed) {
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
