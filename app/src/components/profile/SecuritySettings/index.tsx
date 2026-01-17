import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useFileDownloader } from '@/hooks/useFileDownloader';
import { useKeystore } from '@/hooks/useKeystore';
import type { KeyBackup } from '@/lib/crypto';
import styles from './SecuritySettings.module.css';

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Скачивание бэкапа
    const handleDownloadBackup = async () => {
        if (!backupPassword) {
            alert(t('profile.enterBackupPassword'));
            return;
        }

        const backup = await exportKeys(backupPassword);
        if (!backup) {
            alert(t('profile.backupError'));
            return;
        }

        const filename = `knock-backup-${new Date().toISOString().slice(0, 10)}.json`;
        downloadJson(backup, filename);

        setBackupPassword('');
        alert(t('profile.backupCreated'));
    };

    // Восстановление из файла
    const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!backupPassword) {
            alert(t('profile.enterBackupPassword'));
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const text = evt.target?.result as string;
                const backupData = JSON.parse(text) as KeyBackup;
                await restoreKeys(backupData, backupPassword);
                alert(t('profile.pkeysRestored'));
                setBackupPassword('');
            } catch (err) {
                console.error(err);
                alert(t('profile.restoreError'));
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className={styles.securitySection}>
            <h2>{t('profile.securityTitle')}</h2>
            <div className={styles.field}>
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
            </div>
            <div className={styles.actions}>
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
            </div>
        </div>
    );
}
