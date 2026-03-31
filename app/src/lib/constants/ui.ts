export const COMPONENT_INTENT = {
    INFO: "info",
    SUCCESS: "success",
    WARNING: "warning",
    DANGER: "danger",
    NEUTRAL: "neutral",
    PRIMARY: "primary",
    SECONDARY: "secondary",
} as const;

export const CONTACT_PICKER_MODE = {
    SINGLE: "single",
    MULTI: "multi",
} as const;

export const NOTIFICATION_SOUND = {
    DEFAULT: "default",
    CHIME: "chime",
    NONE: "none",
} as const;

export const NOTIFICATION_SOUNDS = [
    NOTIFICATION_SOUND.DEFAULT,
    NOTIFICATION_SOUND.CHIME,
    NOTIFICATION_SOUND.NONE,
] as const;
