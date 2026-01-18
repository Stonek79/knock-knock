import { Box, Flex, Heading } from '@radix-ui/themes';
import { type ChangeEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useFileDownloader } from '@/hooks/useFileDownloader';
import { useKeystore } from '@/hooks/useKeystore';
import type { KeyBackup } from '@/lib/crypto';

/**
 * Компонент настроек безопасности профиля.
 * Управление резервным копированием ключей шифрования.
 */
export function SecuritySettings() {
    const { t } = useTranslation();
    const {
        initialized: keysInitialized,
        exportKeys,
        restoreKeys,
    } = useKeystore();
    const { downloadJson } = useFileDownloader();

    const [backupPassword, setBackupPassword] = useState('');
    const [statusMessage, setStatusMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Скачивание бэкапа
    const handleDownloadBackup = async () => {
        setStatusMessage(null);
        if (!backupPassword) {
            setStatusMessage({
                type: 'error',
                text: t('profile.enterBackupPassword'),
            });
            return;
        }

        const backup = await exportKeys(backupPassword);
        if (!backup) {
            setStatusMessage({ type: 'error', text: t('profile.backupError') });
            return;
        }

        const filename = `knock-backup-${new Date().toISOString().slice(0, 10)}.json`;
        downloadJson(backup, filename);

        setBackupPassword('');
        setStatusMessage({
            type: 'success',
            text: t('profile.backupCreated'),
        });
    };

    // Восстановление из файла
    const handleRestoreBackup = (e: ChangeEvent<HTMLInputElement>) => {
        setStatusMessage(null);
        const file = e.target.files?.[0];
        if (!file) return;

        if (!backupPassword) {
            setStatusMessage({
                type: 'error',
                text: t('profile.enterBackupPassword'),
            });
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const text = evt.target?.result as string;
                const backupData = JSON.parse(text) as KeyBackup;
                await restoreKeys(backupData, backupPassword);
                setStatusMessage({
                    type: 'success',
                    text: t('profile.pkeysRestored'),
                });
                setBackupPassword('');
            } catch (err) {
                console.error(err);
                setStatusMessage({
                    type: 'error',
                    text: t('profile.restoreError'),
                });
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <Box mt="8" pt="8" style={{ borderTop: '1px solid var(--gray-a6)' }}>
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
            <Flex direction="column" gap="2" mb="4">
                <Label htmlFor="backupPassword">
                    {t('profile.backupPassword')}
                </Label>
                <Input
                    id="backupPassword"
                    type="password"
                    placeholder={t('profile.backupPasswordPlaceholder')}
                    value={backupPassword}
                    onChange={(e) => setBackupPassword(e.target.value)}
                />
            </Flex>
            <Flex gap="3" wrap="wrap" mt="4">
                <Button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={!keysInitialized || !backupPassword}
                >
                    {t('profile.downloadBackup')}
                </Button>

                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!backupPassword}
                >
                    {t('profile.restoreBackup')}
                </Button>

                <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleRestoreBackup}
                />
            </Flex>
        </Box>
    );
}
