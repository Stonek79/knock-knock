import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Card } from "@/components/ui/Card";
import styles from "../security.module.css";

interface KeysStatusCardProps {
    areKeysPublished: boolean;
}

/**
 * Карточка статуса ключей шифрования.
 * Использует нативные span вместо Radix Text.
 */
export function KeysStatusCard({ areKeysPublished }: KeysStatusCardProps) {
    const { t } = useTranslation();

    return (
        <Card variant="surface">
            <Flex align="center" gap="3">
                <Box
                    className={`${styles.statusIndicator} ${
                        areKeysPublished
                            ? styles.statusActive
                            : styles.statusSyncing
                    }`}
                />
                <Flex direction="column">
                    <span className={styles.statusTitle}>
                        {areKeysPublished
                            ? t(
                                  "profile.encryptionActiveTitle",
                                  "Шифрование активно",
                              )
                            : t(
                                  "profile.encryptionSyncing",
                                  "Синхронизация ключей...",
                              )}
                    </span>
                    <span className={styles.statusDesc}>
                        {areKeysPublished
                            ? t(
                                  "profile.keysSyncedDesc",
                                  "Вы можете общаться безопасно.",
                              )
                            : t(
                                  "profile.keysSyncingDesc",
                                  "Генерация криптографических ключей...",
                              )}
                    </span>
                </Flex>
            </Flex>
        </Card>
    );
}
