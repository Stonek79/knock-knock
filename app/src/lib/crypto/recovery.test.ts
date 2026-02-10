import { describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/lib/constants/errors";
import { createBackup, restoreBackup } from "./recovery";

// Web Crypto API доступен глобально в Node 20+ и Vitest (jsdom).

describe("Recovery Service", () => {
    it("должен успешно создать и восстановить бэкап с правильным паролем", async () => {
        const identityKey = (await window.crypto.subtle.generateKey(
            { name: "Ed25519" },
            true,
            ["sign", "verify"],
        )) as CryptoKeyPair;

        const preKey = (await window.crypto.subtle.generateKey(
            { name: "X25519" },
            true,
            ["deriveKey", "deriveBits"],
        )) as CryptoKeyPair;

        const password = "correct-password";

        const backup = await createBackup(password, identityKey, preKey);

        expect(backup).toBeDefined();
        expect(backup.version).toBe(1);

        const result = await restoreBackup(backup, password);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value.identity).toBeDefined();
            expect(result.value.prekey).toBeDefined();
        }
    });

    it("должен вернуть ошибку DECRYPT_FAILED при неверном пароле", async () => {
        // Скрываем ожидаемый console.error
        const consoleSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        const identityKey = (await window.crypto.subtle.generateKey(
            { name: "Ed25519" },
            true,
            ["sign", "verify"],
        )) as CryptoKeyPair;

        const preKey = (await window.crypto.subtle.generateKey(
            { name: "X25519" },
            true,
            ["deriveKey", "deriveBits"],
        )) as CryptoKeyPair;

        const password = "correct-password";
        const wrongPassword = "wrong-password";

        const backup = await createBackup(password, identityKey, preKey);

        const result = await restoreBackup(backup, wrongPassword);

        // Проверяем, что ошибка залогировалась, но не засоряем вывод
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.kind).toBe(ERROR_CODES.DECRYPT_FAILED);
        }
    });

    it("должен вернуть ошибку INVALID_BACKUP при поврежденных данных", async () => {
        // Скрываем ожидаемый console.error
        const consoleSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        const backup = {
            version: 1,
            salt: "satl",
            iv: "iv",
            data: "corrupted-base64!",
        };

        const result = await restoreBackup(backup, "password");

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect([
                ERROR_CODES.INVALID_BACKUP,
                ERROR_CODES.DECRYPT_FAILED,
            ]).toContain(result.error.kind);
        }
    });

    it("должен вернуть UNSUPPORTED_VERSION при несовпадении версий", async () => {
        const backup = {
            version: 999,
            salt: "",
            iv: "",
            data: "",
        };

        const result = await restoreBackup(backup, "password");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.kind).toBe(ERROR_CODES.UNSUPPORTED_VERSION);
        }
    });
});
