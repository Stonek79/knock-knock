import { Box, Flex, Text, TextField } from "@radix-ui/themes";
import type { ChangeEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { StatusMessage } from "../hooks/useKeysBackup";
import styles from "../SecuritySettings/security.module.css";

interface BackupControlsProps {
    backupPassword: string;
    setBackupPassword: (val: string) => void;
    statusMessage: StatusMessage | null;
    fileInputRef: RefObject<HTMLInputElement | null>;
    handleDownloadBackup: () => void;
    handleRestoreBackup: (e: ChangeEvent<HTMLInputElement>) => void;
    keysInitialized: boolean;
}

/**
 * Компонент управления резервным копированием ключей.
 * Содержит поле ввода пароля и кнопки экспорта/импорта.
 */
export function BackupControls({
    backupPassword,
    setBackupPassword,
    statusMessage,
    fileInputRef,
    handleDownloadBackup,
    handleRestoreBackup,
    keysInitialized,
}: BackupControlsProps) {
    const { t } = useTranslation();

    return (
        <Flex direction="column" gap="4">
            {statusMessage && (
                <Box>
                    <Alert
                        variant={
                            statusMessage.type === "success"
                                ? "success"
                                : "destructive"
                        }
                    >
                        <AlertTitle>
                            {statusMessage.type === "success"
                                ? t("common.success")
                                : t("common.error")}
                        </AlertTitle>
                        <AlertDescription>
                            {statusMessage.text}
                        </AlertDescription>
                    </Alert>
                </Box>
            )}

            <Flex direction="column" gap="2">
                <Text
                    as="label"
                    htmlFor="backupPassword"
                    size="2"
                    weight="medium"
                >
                    {t("profile.backupPassword")}
                </Text>
                <TextField.Root
                    id="backupPassword"
                    type="password"
                    placeholder={t("profile.backupPasswordPlaceholder")}
                    value={backupPassword}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setBackupPassword(e.target.value)
                    }
                />
            </Flex>

            <Flex gap="3" wrap="wrap">
                <Button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={!keysInitialized || !backupPassword}
                >
                    {t("profile.downloadBackup")}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!backupPassword}
                >
                    {t("profile.restoreBackup")}
                </Button>

                <Box className={styles.hiddenInput}>
                    <input
                        type="file"
                        accept=".json"
                        ref={fileInputRef}
                        onChange={handleRestoreBackup}
                    />
                </Box>
            </Flex>
        </Flex>
    );
}
