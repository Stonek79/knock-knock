import type { z } from "zod";
import type { AUTH_MODES } from "@/lib/constants/auth";
import type { loginSchema } from "@/lib/schemas/auth";

export type AuthMode = (typeof AUTH_MODES)[keyof typeof AUTH_MODES];
export type LoginSchema = z.infer<typeof loginSchema>;
