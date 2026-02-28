import { describe, expect, it, vi } from "vitest";
import { STORAGE_BUCKETS } from "@/lib/constants";
import * as cryptoMessages from "@/lib/crypto/messages";
import { supabase } from "@/lib/supabase";
import { uploadAudio, uploadMedia } from "./uploadMedia";

// Мокаем Supabase клиент
vi.mock("@/lib/supabase", () => ({
    supabase: {
        storage: {
            from: vi.fn(() => ({
                upload: vi.fn(),
                getPublicUrl: vi.fn(),
            })),
        },
    },
}));

// Мокаем криптографию
vi.mock("@/lib/crypto/messages", () => ({
    encryptBlob: vi.fn(),
}));

describe("Сервис загрузки медиа", () => {
    const mockRoomId = "test-room-id";
    const mockFile = new File(["test content"], "test-image.png", {
        type: "image/png",
    });
    const mockAudioBlob = new Blob(["audio data"], { type: "audio/webm" });
    const mockRoomKey = {} as CryptoKey; // заглушка

    beforeEach(() => {
        vi.clearAllMocks();
        // Мокаем randomUUID чтобы ID предсказуемо работал в тестах
        vi.spyOn(crypto, "randomUUID").mockReturnValue(
            "uuid-1234" as `${string}-${string}-${string}-${string}-${string}`,
        );
    });

    describe("uploadMedia", () => {
        it("должен загружать файл в бакет CHAT_MEDIA и возвращать объект вложения", async () => {
            const mockUpload = vi
                .fn()
                .mockResolvedValue({ data: { path: "..." }, error: null });
            const mockGetPublicUrl = vi.fn().mockReturnValue({
                data: { publicUrl: "https://example.com/media" },
            });

            vi.mocked(supabase.storage.from).mockReturnValue({
                upload: mockUpload,
                getPublicUrl: mockGetPublicUrl,
            } as unknown as ReturnType<typeof supabase.storage.from>);

            const result = await uploadMedia(mockFile, mockRoomId);

            expect(supabase.storage.from).toHaveBeenCalledWith(
                STORAGE_BUCKETS.CHAT_MEDIA,
            );
            expect(mockUpload).toHaveBeenCalledWith(
                `${mockRoomId}/uuid-1234.png`,
                mockFile,
                expect.any(Object),
            );
            expect(result).toEqual({
                id: "uuid-1234",
                file_name: "test-image.png",
                file_size: mockFile.size,
                content_type: "image/png",
                url: "https://example.com/media",
                type: "image",
            });
        });

        it("должен выбрасывать ошибку, если загрузка не удалась", async () => {
            const mockUpload = vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Storage error" },
            });
            vi.mocked(supabase.storage.from).mockReturnValue({
                upload: mockUpload,
            } as unknown as ReturnType<typeof supabase.storage.from>);

            await expect(uploadMedia(mockFile, mockRoomId)).rejects.toThrow(
                "Media upload failed: Storage error",
            );
        });
    });

    describe("uploadAudio", () => {
        it("должен шифровать и загружать аудио в бакет CHAT_AUDIO", async () => {
            const mockEncryptedBlob = new Blob(["encrypted audio"]);
            vi.mocked(cryptoMessages.encryptBlob).mockResolvedValue(
                mockEncryptedBlob,
            );

            const mockUpload = vi
                .fn()
                .mockResolvedValue({ data: { path: "..." }, error: null });
            const mockGetPublicUrl = vi.fn().mockReturnValue({
                data: { publicUrl: "https://example.com/audio" },
            });

            vi.mocked(supabase.storage.from).mockReturnValue({
                upload: mockUpload,
                getPublicUrl: mockGetPublicUrl,
            } as unknown as ReturnType<typeof supabase.storage.from>);

            const result = await uploadAudio(
                mockAudioBlob,
                mockRoomId,
                mockRoomKey,
            );

            expect(cryptoMessages.encryptBlob).toHaveBeenCalledWith(
                mockAudioBlob,
                mockRoomKey,
            );
            expect(supabase.storage.from).toHaveBeenCalledWith(
                STORAGE_BUCKETS.CHAT_AUDIO,
            );
            expect(mockUpload).toHaveBeenCalledWith(
                `${mockRoomId}/uuid-1234.enc`,
                mockEncryptedBlob,
                expect.any(Object),
            );
            expect(result).toMatchObject({
                id: "uuid-1234",
                file_name: "Voice Message",
                file_size: mockAudioBlob.size, // Should return original size
                type: "audio",
                url: "https://example.com/audio",
            });
        });
    });
});
