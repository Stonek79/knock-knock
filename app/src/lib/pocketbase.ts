import PocketBase from "pocketbase";
import { env } from "./env";
import type { TypedPocketBase } from "./types/pocketbase-types";

/**
 * Синглтон-инстанс PocketBase-клиента.
 */
export const pb = new PocketBase(env.VITE_PB_URL) as TypedPocketBase;

/**
 * В DEV-режиме отключаем авто-отмену запросов, чтобы избежать ложных ошибок Abort
 * из-за двойного рендера в React StrictMode. В PROD оставляем для оптимизации.
 */
if (import.meta.env.DEV) {
    pb.autoCancellation(false);
}
