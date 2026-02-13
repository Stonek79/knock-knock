import { Box, Card, Flex, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import styles from "../security.module.css";

interface KeysStatusCardProps {
    areKeysPublished: boolean;
}

export function KeysStatusCard({ areKeysPublished }: KeysStatusCardProps) {
    const { t } = useTranslation();

    return (
        <Card size="2" variant="surface">
            <Flex align="center" gap="3">
                <Box
                    className={`${styles.statusIndicator} ${
                        areKeysPublished
                            ? styles.statusActive
                            : styles.statusSyncing
                    }`}
                />
                <Flex direction="column">
                    <Text weight="bold" size="2">
                        {areKeysPublished
                            ? t(
                                  "profile.encryptionActiveTitle",
                                  "Шифрование активно",
                              )
                            : t(
                                  "profile.encryptionSyncing",
                                  "Синхронизация ключей...",
                              )}
                    </Text>
                    <Text size="1" color="gray">
                        {areKeysPublished
                            ? t(
                                  "profile.keysSyncedDesc",
                                  "Вы можете общаться безопасно.",
                              )
                            : t(
                                  "profile.keysSyncingDesc",
                                  "Генерация криптографических ключей...",
                              )}
                    </Text>
                </Flex>
            </Flex>
        </Card>
    );
}
