import { type ChangeEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFileDownloader } from "@/hooks/useFileDownloader";
import { useKeystore } from "@/hooks/useKeystore";
import { COMPONENT_INTENT } from "@/lib/constants/ui";
import type { KeyBackup } from "@/lib/crypto/recovery";
import type { ComponentIntent } from "@/lib/types/ui";

export interface StatusMessage {
    type: ComponentIntent;
    text: string;
}

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

    const handleDownloadBackup = async () => {
        setStatusMessage(null);
        if (!backupPassword) {
            setStatusMessage({
                type: COMPONENT_INTENT.DANGER,
                text: t("profile.enterBackupPassword"),
            });
            return;
        }

        const backup = await exportKeys(backupPassword);
        if (!backup) {
            setStatusMessage({
                type: COMPONENT_INTENT.DANGER,
                text: t("profile.backupError"),
            });
            return;
        }

        const filename = `knock-backup-${new Date().toISOString().slice(0, 10)}.json`;
        downloadJson(backup, filename);

        setBackupPassword("");
        setStatusMessage({
            type: COMPONENT_INTENT.SUCCESS,
            text: t("profile.backupCreated"),
        });
    };

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
                console.error(err);
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
