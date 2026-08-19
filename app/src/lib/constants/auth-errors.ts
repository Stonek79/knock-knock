/** Stable localization keys for authentication-facing error presenters. */
export const AUTH_ERROR_KEYS = {
    serverUnreachable: "auth.errors.serverUnreachable",
    invalidCredentials: "auth.errors.invalidCredentials",
    unknown: "auth.errors.unknown",
    unauthorized: "auth.errors.unauthorized",
    registerFailed: "auth.errors.registerFailed",
    inviteRequired: "auth.errors.inviteRequired",
    invalidInvite: "auth.errors.invalidInvite",
    inviteExpired: "auth.errors.inviteExpired",
    inviteUsed: "auth.errors.inviteUsed",
    inviteUnavailable: "auth.errors.inviteUnavailable",
    registrationInviteRequired: "auth.errors.registrationInviteRequired",
} as const;

/** Backend messages are a transport compatibility boundary, not UI strings. */
export const REGISTRATION_INVITE_ERROR_KEYS = {
    "Invite code is required": AUTH_ERROR_KEYS.inviteRequired,
    "Invalid invite code": AUTH_ERROR_KEYS.invalidInvite,
    "Invite expired": AUTH_ERROR_KEYS.inviteExpired,
    "Invite limit reached": AUTH_ERROR_KEYS.inviteUsed,
    "Invite unavailable": AUTH_ERROR_KEYS.inviteUnavailable,
    "Registration invite required": AUTH_ERROR_KEYS.registrationInviteRequired,
} as const;
