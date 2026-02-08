import {
    Box,
    Flex,
    Heading,
    Separator,
    Text,
    TextField,
} from '@radix-ui/themes';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';
import { KeysStatusCard } from '../components/KeysStatusCard';
import { useKeysBackup } from '../hooks/useKeysBackup';
import { useProfileKeys } from '../hooks/useProfileKeys';
import styles from './security.module.css';

/**
 * Компонент настроек безопасности профиля.
 * Управление резервным копированием ключей шифрования.
 */
export function SecuritySettings() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { areKeysPublished } = useProfileKeys(user?.id);
    const {
        backupPassword,
        setBackupPassword,
        statusMessage,
        fileInputRef,
        handleDownloadBackup,
        handleRestoreBackup,
        keysInitialized,
    } = useKeysBackup();

    return (
        <Box mt="8" pt="4">
            <Separator size="4" mb="6" />

            <Heading size="4" mb="4">
                {t('profile.securityTitle')}
            </Heading>

            {statusMessage && (
                <Box mb="4">
                    <Alert
                        variant={
                            statusMessage.type === 'success'
                                ? 'success'
                                : 'destructive'
                        }
                    >
                        <AlertTitle>
                            {statusMessage.type === 'success'
                                ? t('common.success')
                                : t('common.error')}
                        </AlertTitle>
                        <AlertDescription>
                            {statusMessage.text}
                        </AlertDescription>
                    </Alert>
                </Box>
            )}

            <Flex direction="column" gap="4">
                {/* Индикатор статуса ключей */}
                <KeysStatusCard areKeysPublished={areKeysPublished} />

                <Flex direction="column" gap="2">
                    <Text
                        as="label"
                        htmlFor="backupPassword"
                        size="2"
                        weight="medium"
                    >
                        {t('profile.backupPassword')}
                    </Text>
                    <TextField.Root
                        id="backupPassword"
                        type="password"
                        placeholder={t('profile.backupPasswordPlaceholder')}
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
                        {t('profile.downloadBackup')}
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!backupPassword}
                    >
                        {t('profile.restoreBackup')}
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
        </Box>
    );
}
