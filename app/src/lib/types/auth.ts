import type { z } from "zod";
import type {
    AUTH_MODES,
    AUTH_VIEW_MODES,
    USER_ROLE,
} from "@/lib/constants/auth";
import type { loginSchema } from "@/lib/schemas/auth";

export type AuthMode = (typeof AUTH_MODES)[keyof typeof AUTH_MODES];
export type AuthViewMode =
    (typeof AUTH_VIEW_MODES)[keyof typeof AUTH_VIEW_MODES];
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
export type LoginSchema = z.infer<typeof loginSchema>;
