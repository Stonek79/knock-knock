import { Box, Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useFileDownloader } from '@/hooks/useFileDownloader';
import { useKeystore } from '@/hooks/useKeystore';
import type { KeyBackup } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

/**
 * Тип данных публичных ключей профиля.
 */
interface ProfileKeys {
    public_key_x25519: string | null;
    public_key_signing: string | null;
}

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
        publicKeyEd25519,
        publicKeyX25519,
    } = useKeystore();
    const { downloadJson } = useFileDownloader();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [backupPassword, setBackupPassword] = useState('');
    const [statusMessage, setStatusMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [syncing, setSyncing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * Запрос публичных ключей из профиля пользователя.
     * Использует TanStack Query для кеширования и автоматического обновления.
     */
    const { data: profileKeys } = useQuery({
        queryKey: ['profile-keys', user?.id],
        queryFn: async (): Promise<ProfileKeys | null> => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('public_key_x25519, public_key_signing')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Failed to fetch profile keys', error);
                return null;
            }
            return data;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 минут
    });

    // Проверяем, опубликованы ли уже ключи в профиле
    const areKeysPublished = !!(
        profileKeys?.public_key_x25519 && profileKeys?.public_key_signing
    );

    // Синхронизация ключей с профилем в БД
    const handleSyncKeys = async () => {
        if (!user || !publicKeyX25519) return;
        setSyncing(true);
        setStatusMessage(null);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    public_key_x25519: publicKeyX25519,
                    public_key_signing: publicKeyEd25519,
                })
                .eq('id', user.id);

            if (error) throw error;

            // Инвалидируем кеш TanStack Query для обновления данных
            await queryClient.invalidateQueries({
                queryKey: ['profile-keys', user.id],
            });

            setStatusMessage({
                type: 'success',
                text: t(
                    'profile.keysSynced',
                    'Ключи шифрования активированы и привязаны к профилю',
                ),
            });
        } catch (err) {
            console.error('Failed to sync keys', err);
            setStatusMessage({
                type: 'error',
                text: t('profile.syncError', 'Ошибка при активации ключей'),
            });
        } finally {
            setSyncing(false);
        }
    };

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
                    text: t('profile.keysRestored'),
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
                {/* Блок защиты (показываем только если ключи еще не опубликованы или есть ошибка синхронизации) */}
                {(!areKeysPublished || !keysInitialized) && (
                    <Card size="2" variant="surface">
                        <Heading size="3" mb="2">
                            {t('profile.encryptionTitle', 'Защита сообщений')}
                        </Heading>
                        <Text size="2" color="gray" mb="4" as="p">
                            {t(
                                'profile.encryptionDesc',
                                'Чтобы другие пользователи могли отправлять вам зашифрованные сообщения, необходимо активировать ваши публичные ключи.',
                            )}
                        </Text>
                        <Button
                            onClick={handleSyncKeys}
                            disabled={!keysInitialized || syncing}
                            loading={syncing}
                        >
                            {t(
                                'profile.activateEncryption',
                                'Активировать шифрование',
                            )}
                        </Button>
                    </Card>
                )}

                {areKeysPublished && (
                    <Alert variant="success">
                        <AlertTitle>
                            {t(
                                'profile.encryptionActiveTitle',
                                'Шифрование активно',
                            )}
                        </AlertTitle>
                        <AlertDescription>
                            {t(
                                'profile.keysSyncedDesc',
                                'Ваши ключи шифрования синхронизированы. Вы можете общаться безопасно.',
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <Flex direction="column" gap="2">
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
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!backupPassword}
                    >
                        {t('profile.restoreBackup')}
                    </Button>

                    <Box style={{ display: 'none' }}>
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
