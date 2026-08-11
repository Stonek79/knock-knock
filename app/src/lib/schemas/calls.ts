import { z } from "zod";
import { ACTIVE_CALL_STATUS } from "@/lib/constants/calls";
import { CALL_TYPE } from "@/lib/constants/db";

/**
 * Zod-схема для FSM статуса активного звонка
 */
export const activeCallStatusSchema = z.enum([
    ACTIVE_CALL_STATUS.INITIATING,
    ACTIVE_CALL_STATUS.CALLING,
    ACTIVE_CALL_STATUS.CONNECTING,
    ACTIVE_CALL_STATUS.ACTIVE,
    ACTIVE_CALL_STATUS.RECONNECTING,
]);

/**
 * Zod-схема типа вызова (аудио или видео)
 */
export const callTypeSchema = z.enum([CALL_TYPE.AUDIO, CALL_TYPE.VIDEO]);

/**
 * Zod-схема активной сессии звонка
 */
export const activeCallSessionSchema = z.object({
    status: activeCallStatusSchema,
    type: callTypeSchema,
    isInitiator: z.boolean(),
    roomName: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
    token: z.string().nullable(),
    serverUrl: z.string().nullable(),
    callLogId: z.string().nullable(),
    isMuted: z.boolean(),
    isVideoMuted: z.boolean(),
    isScreenSharing: z.boolean(),
});

/**
 * Zod-схема входящей сессии звонка (вторая линия)
 */
export const incomingCallSessionSchema = z.object({
    roomId: z.string(),
    callLogId: z.string(),
    type: callTypeSchema,
});
