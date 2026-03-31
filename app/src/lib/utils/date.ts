/**
 * Гарантирует, что строка даты соответствует ISO формату (с 'T').
 * PocketBase возвращает даты с пробелом между датой и временем.
 */
export const ensureISODate = (dateStr: string): string => {
    if (!dateStr) {
        return DEFAULT_DATE;
    }
    // Заменяем пробел на T, если его нет
    let normalized = dateStr.includes(" ")
        ? dateStr.replace(" ", "T")
        : dateStr;
    // Добавляем Z, если нет указания зоны
    if (!normalized.includes("Z") && !normalized.includes("+")) {
        normalized += "Z";
    }
    return normalized;
};

/**
 * Форматирует дату для отображения в списке чатов.
 * Правила:
 * - Сегодня: "Сегодня" (переведённое)
 * - Вчера: "Вчера" (переведённое)
 * - Иначе: "dd.mm.yy"
 *
 * @param dateString Строка даты в формате ISO или совместимом
 */
export const formatChatTime = (dateString: string): string => {
    const normalized = ensureISODate(dateString);
    const date = new Date(normalized);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateOnly = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    );
    const diffDays = Math.floor(
        (today.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) {
        return "common.today"; // Возвращаем ключ
    }
    if (diffDays === 1) {
        return "common.yesterday"; // Возвращаем ключ
    }
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`; // Возвращаем готовую строку
};

export const DEFAULT_DATE = "1970-01-01T00:00:00Z";
