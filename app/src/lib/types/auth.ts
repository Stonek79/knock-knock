import type { AUTH_VIEW_MODES } from "@/lib/constants";

export type AuthViewMode =
    (typeof AUTH_VIEW_MODES)[keyof typeof AUTH_VIEW_MODES];
