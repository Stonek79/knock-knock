import { type ChangeEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFileDownloader } from "@/hooks/useFileDownloader";
import { useKeystore } from "@/hooks/useKeystore";
import { COMPONENT_INTENT } from "@/lib/constants";
import type { KeyBackup } from "@/lib/crypto/recovery";
import { logger } from "@/lib/logger";
import type { ComponentIntent } from "@/lib/types";

export interface StatusMessage {
    type: ComponentIntent;
    text: string;
}

/**
 * Хук для управления резервным копированием и восстановлением ключей шифрования.
 * Инкапсулирует работу с Keystore, ввод пароля и скачивание/загрузку файлов.
 */
export function useKeysBackup() {
    const { t } = useTranslation();
    const {
        initialized: keysInitialized,
        exportKeys,
        restoreKeys,
    } = useKeystore();
    const { downloadJson } = useFileDownloader();

    const [backupPassword, setBackupPassword] = useState("");
    const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(
        null,
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * Обработчик скачивания зашифрованного бэкапа.
     */
    const handleDownloadBackup = async () => {
        setStatusMessage(null);
        if (!backupPassword) {
            setStatusMessage({
                type: COMPONENT_INTENT.DANGER,
                text: t("profile.enterBackupPassword"),
            });
            return;
        }

        try {
            const result = await exportKeys(backupPassword);
            if (result.isErr()) {
                logger.error(
                    "Ошибка при создании резервной копии:",
                    result.error,
                );
                setStatusMessage({
                    type: COMPONENT_INTENT.DANGER,
                    text: t("profile.backupError"), // Или более специфичное сообщение из result.error.message
                });
                return;
            }
            const backup = result.value;

            const filename = `knock-backup-${new Date().toISOString().slice(0, 10)}.json`;
            downloadJson(backup, filename);

            setBackupPassword("");
            setStatusMessage({
                type: COMPONENT_INTENT.SUCCESS,
                text: t("profile.backupCreated"),
            });
        } catch (err) {
            logger.error("Ошибка при создании резервной копии ключей:", err);
            setStatusMessage({
                type: COMPONENT_INTENT.DANGER,
                text: t("profile.backupError"),
            });
        }
    };

    /**
     * Обработчик восстановления ключей из файла.
     */
    const handleRestoreBackup = (e: ChangeEvent<HTMLInputElement>) => {
        setStatusMessage(null);
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        if (!backupPassword) {
            setStatusMessage({
                type: COMPONENT_INTENT.DANGER,
                text: t("profile.enterBackupPassword"),
            });
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const text = evt.target?.result as string;
                const backupData = JSON.parse(text) as KeyBackup;
                await restoreKeys(backupData, backupPassword);
                setStatusMessage({
                    type: COMPONENT_INTENT.SUCCESS,
                    text: t("profile.keysRestored"),
                });
                setBackupPassword("");
            } catch (err) {
                logger.error(
                    "Ошибка при восстановлении ключей из бэкапа:",
                    err,
                );
                setStatusMessage({
                    type: COMPONENT_INTENT.DANGER,
                    text: t("profile.restoreError"),
                });
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };
        reader.onerror = (err) => {
            logger.error("Ошибка при чтении файла резервной копии:", err);
        };
        reader.readAsText(file);
    };

    return {
        backupPassword,
        setBackupPassword,
        statusMessage,
        fileInputRef,
        handleDownloadBackup,
        handleRestoreBackup,
        keysInitialized,
    };
}
