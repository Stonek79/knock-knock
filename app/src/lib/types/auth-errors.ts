import type { AUTH_ERROR_KEYS } from "../constants/auth-errors";

export type AuthErrorContext = "login" | "register";

export type AuthErrorKey =
    (typeof AUTH_ERROR_KEYS)[keyof typeof AUTH_ERROR_KEYS];
