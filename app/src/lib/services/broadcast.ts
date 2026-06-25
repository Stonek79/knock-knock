/**
 * SERVICE: BROADCAST
 * Бизнес-логика для работы с системными рассылками.
 */

import type { ListResult } from "pocketbase";
import {
    ATTACHMENT_TYPES,
    ERROR_CODES,
    MEDIA_FIELDS,
    MIME_PREFIXES,
} from "../constants";
import { pb } from "../pocketbase";
import { broadcastRepository } from "../repositories/broadcast.repository";
import { mediaRepository } from "../repositories/media.repository";
import type {
    BroadcastRepoError,
    MediaRepoError,
    MediaResponse,
    Result,
} from "../types";
import type { TaskQueueResponse } from "../types/pocketbase-types";
import { appError, err } from "../utils/result";

export const broadcastService = {
    /**
     * Отправить глобальную рассылку всем пользователям.
     */
    sendBroadcast: async (
        text: string,
        files?: File[],
        audioBlob?: Blob,
    ): Promise<Result<void, BroadcastRepoError>> => {
        const attachmentIds: string[] = [];

        try {
            const userId = pb.authStore.record?.id;
            if (!userId) {
                return err(
                    appError(
                        ERROR_CODES.UNAUTHORIZED,
                        "Необходима авторизация",
                    ),
                );
            }

            const uploadTasks: Promise<
                Result<MediaResponse, MediaRepoError>
            >[] = [];

            const uploadFile = (
                file: File | Blob,
                originalName: string,
                mimeType: string,
            ) => {
                const formData = new FormData();
                formData.append(MEDIA_FIELDS.FILE, file, originalName);
                formData.append(MEDIA_FIELDS.CREATED_BY, userId);

                let type: string = ATTACHMENT_TYPES.DOCUMENT;
                if (mimeType.startsWith(MIME_PREFIXES.IMAGE)) {
                    type = ATTACHMENT_TYPES.IMAGE;
                } else if (mimeType.startsWith(MIME_PREFIXES.VIDEO)) {
                    type = ATTACHMENT_TYPES.VIDEO;
                } else if (mimeType.startsWith(MIME_PREFIXES.AUDIO)) {
                    type = ATTACHMENT_TYPES.AUDIO;
                }

                formData.append(MEDIA_FIELDS.TYPE, type);
                formData.append(MEDIA_FIELDS.SIZE, file.size.toString());
                formData.append(MEDIA_FIELDS.MIME_TYPE, mimeType);
                formData.append(MEDIA_FIELDS.IS_VAULT, "false");
                formData.append(
                    MEDIA_FIELDS.REFERENCES,
                    JSON.stringify({ isSystemBroadcast: true }),
                );

                return mediaRepository.uploadMedia(formData);
            };

            if (files && files.length > 0) {
                for (const file of files) {
                    uploadTasks.push(uploadFile(file, file.name, file.type));
                }
            }

            if (audioBlob) {
                uploadTasks.push(
                    uploadFile(audioBlob, "voice.webm", "audio/webm"),
                );
            }

            if (uploadTasks.length > 0) {
                const results = await Promise.all(uploadTasks);
                for (const res of results) {
                    if (res.isErr()) {
                        return err(res.error);
                    }
                    attachmentIds.push(res.value.id);
                }
            }

            return broadcastRepository.sendBroadcast(text, attachmentIds);
        } catch (error) {
            return err(
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Неизвестная ошибка при загрузке медиа",
                    error,
                ),
            );
        }
    },

    getBroadcastHistory: async (): Promise<
        Result<ListResult<TaskQueueResponse>, BroadcastRepoError>
    > => {
        return broadcastRepository.getBroadcastHistory();
    },

    deleteBroadcast: async (
        broadcastId: string,
    ): Promise<Result<void, BroadcastRepoError>> => {
        return broadcastRepository.deleteBroadcast(broadcastId);
    },
};
