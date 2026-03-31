import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    ATTACHMENT_TYPES,
    MEDIA_DEFAULTS,
    MEDIA_FIELDS,
} from "@/lib/constants";
import * as cryptoMessages from "@/lib/crypto/messages";
import type { PBRecord } from "@/lib/types";
import { err, ok } from "@/lib/utils/result";
import { uploadAudio, uploadMedia } from "./uploadMedia";

// Мокаем репозиторий вместо прямого pb.collection
vi.mock("@/lib/repositories/media.repository", () => ({
    mediaRepository: {
        uploadMedia: vi.fn(),
        getFileUrl: vi.fn(),
    },
}));

// Мокаем криптографию
vi.mock("@/lib/crypto/messages", () => ({
    encryptBlob: vi.fn(),
}));

// Мокаем кэширование
vi.mock("@/lib/cache/media", () => ({
    saveMediaBlob: vi.fn(),
}));

// Импортируем замоканный модуль для управления ответами
const { mediaRepository } = await import("@/lib/repositories/media.repository");

describe("Сервис загрузки медиа", () => {
    const mockRoomId = "test-room-id";
    const mockFile = new File(["test content"], "test-image.png", {
        type: "image/png",
    });
    const mockAudioBlob = new Blob(["audio data"], { type: "audio/webm" });
    const mockRoomKey = {} as CryptoKey; // заглушка

    /** Создание типизированного мок-рекорда PBMediaRecord */
    const createMockRecord = (
        overrides: Partial<PBRecord> & { id: string; file: string },
    ): PBRecord => ({
        collectionId: "media",
        collectionName: "media",
        created: "2026-01-01",
        updated: "2026-01-01",
        owner: "",
        ...overrides,
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("uploadMedia", () => {
        it("должен загружать файл через mediaRepository и возвращать объект вложения", async () => {
            const mockRecord = createMockRecord({
                id: "rec-123",
                file: "test-image.png",
            });

            vi.mocked(mediaRepository.uploadMedia).mockResolvedValue(
                ok(mockRecord),
            );
            vi.mocked(mediaRepository.getFileUrl).mockReturnValue(
                "https://example.com/media",
            );

            const result = await uploadMedia(mockFile);

            expect(mediaRepository.uploadMedia).toHaveBeenCalled();
            const formDataArg = vi.mocked(mediaRepository.uploadMedia).mock
                .calls[0][0];
            expect(formDataArg.get(MEDIA_FIELDS.FILE)).toBeDefined();

            expect(mediaRepository.getFileUrl).toHaveBeenCalledWith(
                mockRecord,
                "test-image.png",
            );
            expect(result).toEqual({
                id: "rec-123",
                file_name: "test-image.png",
                file_size: mockFile.size,
                content_type: "image/png",
                url: "https://example.com/media",
                type: ATTACHMENT_TYPES.IMAGE,
            });
        });

        it("должен корректно обрабатывать и пробрасывать ошибку репозитория", async () => {
            const repoErrorMessage = "Storage quota exceeded";
            // Используем kind: "UploadError" для соответствия типу MediaRepoError
            const mockError = {
                kind: "UploadError" as const,
                message: repoErrorMessage,
                details: { reason: "limit" },
            };
            vi.mocked(mediaRepository.uploadMedia).mockResolvedValue(
                err(mockError),
            );

            // Проверяем, что ошибка пробрасывается с корректным текстом
            await expect(uploadMedia(mockFile)).rejects.toThrow(
                repoErrorMessage,
            );

            // Также убедимся, что репозиторий вызывался один раз
            expect(mediaRepository.uploadMedia).toHaveBeenCalledTimes(1);
        });
    });

    describe("uploadAudio", () => {
        it("должен шифровать и загружать аудио через mediaRepository", async () => {
            const mockEncryptedBlob = new Blob(["encrypted audio"]);
            vi.mocked(cryptoMessages.encryptBlob).mockResolvedValue(
                mockEncryptedBlob,
            );

            const mockRecord = createMockRecord({
                id: "rec-audio",
                file: "voice.enc",
            });
            vi.mocked(mediaRepository.uploadMedia).mockResolvedValue(
                ok(mockRecord),
            );
            vi.mocked(mediaRepository.getFileUrl).mockReturnValue(
                "https://example.com/audio",
            );

            const result = await uploadAudio(
                mockAudioBlob,
                mockRoomId,
                mockRoomKey,
            );

            expect(cryptoMessages.encryptBlob).toHaveBeenCalledWith(
                mockAudioBlob,
                mockRoomKey,
            );
            expect(mediaRepository.uploadMedia).toHaveBeenCalled();

            // Проверяем имя поля в FormData
            const formDataArg = vi.mocked(mediaRepository.uploadMedia).mock
                .calls[0][0];
            expect(formDataArg.get(MEDIA_FIELDS.FILE)).toBeDefined();

            expect(result).toMatchObject({
                id: "rec-audio",
                file_name: MEDIA_DEFAULTS.VOICE_MESSAGE_LABEL,
                file_size: mockAudioBlob.size,
                type: ATTACHMENT_TYPES.AUDIO,
                url: "https://example.com/audio",
            });
        });
    });
});
