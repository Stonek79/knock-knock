import { z } from "zod";
import {
    DESIGN_THEME,
    DESIGN_THEMES,
    NOTIFICATION_SOUND,
    NOTIFICATION_SOUNDS,
    THEME_MODE,
    THEME_MODES,
} from "@/lib/constants";

/** Схемы перечислений */
export const designThemeSchema = z.enum(DESIGN_THEMES);
export const themeModeSchema = z.enum(THEME_MODES);
export const notificationSoundSchema = z.enum(NOTIFICATION_SOUNDS);

/** Настройки пользователя (users.settings) */
export const userSettingsSchema = z.object({
    theme: designThemeSchema.default(DESIGN_THEME.DEFAULT),
    mode: themeModeSchema.default(THEME_MODE.DARK),
    notifications: z
        .object({
            enabled: z.boolean().default(true),
            sound: notificationSoundSchema.default(NOTIFICATION_SOUND.DEFAULT),
            preview: z.boolean().default(true),
        })
        .default({
            enabled: true,
            sound: NOTIFICATION_SOUND.DEFAULT,
            preview: true,
        }),
    privacy: z
        .object({
            show_last_seen: z.boolean().default(true),
            show_online: z.boolean().default(true),
        })
        .default({
            show_last_seen: true,
            show_online: true,
        }),
});

/** Настройки участника комнаты (room_members.settings) */
export const roomMemberSettingsSchema = z.object({
    notifications: z.boolean().default(true),
    mute_until: z.string().optional(),
});

/** Метаданные */
export const metadataSchema = z.record(z.string(), z.unknown()).default({});

export type UserSettings = z.infer<typeof userSettingsSchema>;
