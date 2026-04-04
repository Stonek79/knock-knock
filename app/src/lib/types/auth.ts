import type { AUTH_VIEW_MODES, VERIFY_STATUS } from "@/lib/constants";

export type AuthViewMode =
    (typeof AUTH_VIEW_MODES)[keyof typeof AUTH_VIEW_MODES];

export type VerifyStatus = (typeof VERIFY_STATUS)[keyof typeof VERIFY_STATUS];
