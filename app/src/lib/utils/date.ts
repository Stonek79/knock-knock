/**
 * Форматирует дату для отображения в списке чатов.
 * Правила:
 * - < 1 мин: "сейчас"
 * - < 1 час: "X мин"
 * - < 24 часа: "X ч"
 * - Иначе: "DD MMM" (например, "12 янв")
 *
 * @param dateString Строка даты в формате ISO или совместимом
 * @param locale Локаль (по умолчанию ru-RU)
 */
export const formatChatTime = (
    dateString: string,
    locale = 'ru-RU',
): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'сейчас';
    if (diffMin < 60) return `${diffMin} мин`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ч`;

    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
};
