import { act, renderHook } from "@testing-library/react";
import type { ChangeEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { useKeysBackup } from "./useKeysBackup";

// Моки для хуков
vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

const mockDownloadJson = vi.fn();
vi.mock("@/hooks/useFileDownloader", () => ({
    useFileDownloader: () => ({
        downloadJson: mockDownloadJson,
    }),
}));

const mockExportKeys = vi.fn();
const mockRestoreKeys = vi.fn();
vi.mock("@/hooks/useKeystore", () => ({
    useKeystore: () => ({
        initialized: true,
        exportKeys: mockExportKeys,
        restoreKeys: mockRestoreKeys,
    }),
}));

describe("useKeysBackup", () => {
    it("должен инициализироваться с дефолтными значениями", () => {
        const { result } = renderHook(() => useKeysBackup());

        expect(result.current.backupPassword).toBe("");
        expect(result.current.statusMessage).toBeNull();
        expect(result.current.keysInitialized).toBe(true);
    });

    describe("handleDownloadBackup", () => {
        it("должен вывести ошибку, если пароль не введен", async () => {
            const { result } = renderHook(() => useKeysBackup());

            await act(async () => {
                await result.current.handleDownloadBackup();
            });

            expect(result.current.statusMessage).toEqual({
                type: "danger",
                text: "profile.enterBackupPassword",
            });
            expect(mockExportKeys).not.toHaveBeenCalled();
        });

        it("должен вызвать скачивание и сбросить пароль при успехе", async () => {
            const { result } = renderHook(() => useKeysBackup());
            const mockBackupData = { keys: "blob" };
            mockExportKeys.mockResolvedValueOnce(mockBackupData);

            await act(async () => {
                result.current.setBackupPassword("secure-pass");
            });

            await act(async () => {
                await result.current.handleDownloadBackup();
            });

            expect(mockExportKeys).toHaveBeenCalledWith("secure-pass");
            expect(mockDownloadJson).toHaveBeenCalledWith(
                mockBackupData,
                expect.stringContaining("knock-backup-"),
            );
            expect(result.current.backupPassword).toBe("");
            expect(result.current.statusMessage?.type).toBe("success");
        });

        it("должен вывести ошибку, если экспорт ключей не удался", async () => {
            const { result } = renderHook(() => useKeysBackup());
            mockExportKeys.mockResolvedValueOnce(null);

            await act(async () => {
                result.current.setBackupPassword("secure-pass");
            });

            await act(async () => {
                await result.current.handleDownloadBackup();
            });

            expect(result.current.statusMessage).toEqual({
                type: "danger",
                text: "profile.backupError",
            });
        });
    });

    describe("handleRestoreBackup", () => {
        const createMockFile = (content: string) => {
            const blob = new Blob([content], { type: "application/json" });
            return {
                target: {
                    files: [new File([blob], "backup.json")],
                },
            } as unknown as ChangeEvent<HTMLInputElement>;
        };

        it("должен вывести ошибку, если пароль не введен при восстановлении", () => {
            const { result } = renderHook(() => useKeysBackup());
            const mockEvent = createMockFile(JSON.stringify({ data: "test" }));

            act(() => {
                result.current.handleRestoreBackup(mockEvent);
            });

            expect(result.current.statusMessage).toEqual({
                type: "danger",
                text: "profile.enterBackupPassword",
            });
        });

        it("должен восстановить ключи при корректном файле и пароле", async () => {
            const { result } = renderHook(() => useKeysBackup());
            const backupContent = { version: 1, encrypted: "data" };
            const mockEvent = createMockFile(JSON.stringify(backupContent));

            await act(async () => {
                result.current.setBackupPassword("valid-pass");
            });

            // Используем Promise для ожидания FileReader
            await act(async () => {
                result.current.handleRestoreBackup(mockEvent);
                // FileReader асинхронен, даем ему время
                await new Promise((resolve) => setTimeout(resolve, 50));
            });

            expect(mockRestoreKeys).toHaveBeenCalledWith(
                backupContent,
                "valid-pass",
            );
            expect(result.current.statusMessage?.type).toBe("success");
            expect(result.current.backupPassword).toBe("");
        });

        it("должен вывести ошибку при некорректном JSON", async () => {
            const { result } = renderHook(() => useKeysBackup());
            const mockEvent = createMockFile("invalid-json");

            await act(async () => {
                result.current.setBackupPassword("valid-pass");
            });

            await act(async () => {
                await result.current.handleRestoreBackup(mockEvent);
            });

            // Ждём пока состояние обновится с ошибкой
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
            });

            expect(result.current.statusMessage).toEqual({
                type: "danger",
                text: "profile.restoreError",
            });
        });

        it("должен вывести ошибку, если restoreKeys бросил исключение", async () => {
            const { result } = renderHook(() => useKeysBackup());
            const mockEvent = createMockFile(JSON.stringify({ data: "ok" }));
            mockRestoreKeys.mockRejectedValueOnce(new Error("fail"));

            await act(async () => {
                result.current.setBackupPassword("valid-pass");
            });

            await act(async () => {
                await result.current.handleRestoreBackup(mockEvent);
            });

            // Ждём пока состояние обновится с ошибкой
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
            });

            expect(result.current.statusMessage?.type).toBe("danger");
            expect(result.current.statusMessage?.text).toBe(
                "profile.restoreError",
            );
        });
    });
});
