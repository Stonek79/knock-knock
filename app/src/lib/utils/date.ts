/**
 * Форматирует дату для отображения в списке чатов.
 * Правила:
 * - Сегодня: "Сегодня" (переведённое)
 * - Вчера: "Вчера" (переведённое)
 * - Иначе: "dd.mm.yy"
 *
 * @param dateString Строка даты в формате ISO или совместимом
 * @param t Функция перевода i18n (useTranslation().t)
 */
export const formatChatTime = (
    dateString: string,
    t: (key: string) => string,
): string => {
    const date = new Date(dateString);
    const now = new Date();

    // Сбрасываем время для сравнения только дат
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
        return t('common.today');
    }

    if (diffDays === 1) {
        return t('common.yesterday');
    }

    // Формат dd.mm.yy
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);

    return `${day}.${month}.${year}`;
};
