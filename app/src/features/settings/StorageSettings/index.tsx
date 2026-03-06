import { Database, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import * as AlertDialog from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { clearMediaCache, getMediaCacheSize } from "@/lib/cache/media";
import { formatBytes } from "@/lib/utils/format";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./storage-settings.module.css";

export function StorageSettings() {
    const { t } = useTranslation();
    const [cacheSize, setCacheSize] = useState<number | null>(null);
    const [isClearing, setIsClearing] = useState(false);

    const loadCacheSize = useCallback(async () => {
        const size = await getMediaCacheSize();
        setCacheSize(size);
    }, []);

    useEffect(() => {
        loadCacheSize();
    }, [loadCacheSize]);

    const handleClearCache = async () => {
        setIsClearing(true);
        await clearMediaCache();
        await loadCacheSize();
        setIsClearing(false);
    };

    return (
        <Flex direction="column" className={styles.container}>
            <Box className={styles.content}>
                <Card>
                    <Flex direction="column" gap="4">
                        <Flex align="center" gap="3">
                            <Database
                                size={ICON_SIZE.xl}
                                className={styles.icon}
                            />
                            <Flex direction="column">
                                <Heading size="md">
                                    {t("settings.storage.title", "Медиа кэш")}
                                </Heading>
                                <Text size="sm" intent="secondary">
                                    {t(
                                        "settings.storage.description",
                                        "Изображения и видео сохраняются на вашем устройстве для быстрой загрузки.",
                                    )}
                                </Text>
                            </Flex>
                        </Flex>

                        <Flex
                            justify="between"
                            align="center"
                            className={styles.infoRow}
                        >
                            <Text size="md" weight="medium">
                                {t(
                                    "settings.storage.spaceUsed",
                                    "Занято места",
                                )}
                            </Text>
                            <Text size="md" intent="primary" weight="bold">
                                {cacheSize !== null
                                    ? formatBytes(cacheSize)
                                    : t("common.loading", "Загрузка...")}
                            </Text>
                        </Flex>

                        <AlertDialog.Root>
                            <AlertDialog.Trigger asChild>
                                <Button
                                    variant="solid"
                                    size="md"
                                    disabled={isClearing || cacheSize === 0}
                                    className={styles.clearButton}
                                >
                                    <Trash2 size={ICON_SIZE.sm} />
                                    {t(
                                        "settings.storage.clearCache",
                                        "Очистить кэш",
                                    )}
                                </Button>
                            </AlertDialog.Trigger>

                            <AlertDialog.Content>
                                <AlertDialog.Title>
                                    {t(
                                        "settings.storage.clearTitle",
                                        "Очистка кэша",
                                    )}
                                </AlertDialog.Title>
                                <AlertDialog.Description>
                                    {t(
                                        "settings.storage.clearWarning",
                                        "Вы уверены, что хотите удалить все сохранённые изображения и голосовые сообщения с этого устройства? Они будут загружены снова при просмотре чатов.",
                                    )}
                                </AlertDialog.Description>

                                <Flex
                                    gap="3"
                                    justify="end"
                                    className={styles.dialogActions}
                                >
                                    <AlertDialog.Cancel asChild>
                                        <Button variant="outline">
                                            {t("common.cancel", "Отмена")}
                                        </Button>
                                    </AlertDialog.Cancel>
                                    <AlertDialog.Action asChild>
                                        <Button
                                            variant="solid"
                                            onClick={handleClearCache}
                                            className={styles.destructiveButton}
                                        >
                                            {t(
                                                "settings.storage.deleteFiles",
                                                "Удалить файлы",
                                            )}
                                        </Button>
                                    </AlertDialog.Action>
                                </Flex>
                            </AlertDialog.Content>
                        </AlertDialog.Root>
                    </Flex>
                </Card>
            </Box>
        </Flex>
    );
}
