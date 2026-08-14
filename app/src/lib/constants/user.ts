import type { UsersProfileTypeOptions } from "../types/pocketbase-types";

export const USER_CONTACTS_MODES = {
    LIST: "list",
    SELECT: "select",
} as const;

export const PROFILE_TYPE = {
    PUBLIC: "public",
    PRIVATE: "private",
} as const satisfies Record<string, UsersProfileTypeOptions>;

/** Максимум ключей, запрашиваемых клиентом за один capability-вызов. */
export const MAX_USER_SECURITY_KEYS_PER_REQUEST = 50;
