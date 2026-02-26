/**
 * Схема валидации search-параметров для DM-инициализатора.
 */
export interface DMSearch {
    isPrivate?: boolean;
}

export function validateDMSearch(search: Record<string, unknown>): DMSearch {
    return {
        isPrivate: search.isPrivate === true || search.isPrivate === "true",
    };
}
