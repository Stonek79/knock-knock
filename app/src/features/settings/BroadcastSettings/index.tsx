import { useQuery } from "@tanstack/react-query";
import { Megaphone, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { MessageInput } from "@/features/chat/message";
import { COMPONENT_INTENT, ICON_SIZE, QUERY_KEYS } from "@/lib/constants";
import { broadcastService } from "@/lib/services/broadcast";
import { getErrorMessage } from "@/lib/utils/result";
import styles from "./broadcast-settings.module.css";

interface BroadcastHistoryItem {
    task_key: string;
    created: string;
    payload?: {
        text?: string;
    };
}

export function BroadcastSettings() {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{
        type: typeof COMPONENT_INTENT.SUCCESS | typeof COMPONENT_INTENT.ERROR;
        message: string;
    } | null>(null);

    const {
        data: historyData,
        isLoading: isLoadingHistory,
        refetch: refetchHistory,
    } = useQuery({
        queryKey: QUERY_KEYS.broadcastHistory(),
        queryFn: async () => {
            const result = await broadcastService.getBroadcastHistory();
            if (result.isOk()) {
                const data = result.value as { items?: BroadcastHistoryItem[] };
                return data.items || [];
            }
            return [];
        },
    });

    const history = historyData || [];

    const handleDelete = async (id: string) => {
        if (!window.confirm(t("settings.broadcast.deleteConfirm"))) {
            return;
        }
        const result = await broadcastService.deleteBroadcast(id);
        if (result.isOk()) {
            refetchHistory();
            setStatus({
                type: COMPONENT_INTENT.SUCCESS,
                message: t("settings.broadcast.deleteSuccess"),
            });
        } else {
            setStatus({
                type: COMPONENT_INTENT.ERROR,
                message:
                    getErrorMessage(result.error) ||
                    t("settings.broadcast.deleteError"),
            });
        }
    };

    const handleSend = async (
        text: string,
        files?: File[],
        audioBlob?: Blob,
    ) => {
        if (!text.trim() && (!files || files.length === 0) && !audioBlob) {
            return;
        }

        setIsLoading(true);
        setStatus(null);

        const result = await broadcastService.sendBroadcast(
            text,
            files,
            audioBlob,
        );

        if (result.isOk()) {
            setStatus({
                type: COMPONENT_INTENT.SUCCESS,
                message: t("settings.broadcast.success"),
            });
            refetchHistory();
        } else {
            setStatus({
                type: COMPONENT_INTENT.ERROR,
                message: getErrorMessage(result.error) || t("common.error"),
            });
        }

        setIsLoading(false);
    };

    return (
        <Box className={styles.container}>
            <Flex direction="column" className={styles.content}>
                <Card className={styles.card}>
                    <Flex direction="column" gap="4">
                        <Flex align="center" gap="3">
                            <Megaphone
                                size={ICON_SIZE.xl}
                                className={styles.icon}
                            />
                            <Flex direction="column">
                                <Heading size="md">
                                    {t("settings.broadcast.title")}
                                </Heading>
                                <Text
                                    size="sm"
                                    intent={COMPONENT_INTENT.SECONDARY}
                                >
                                    {t("settings.broadcast.description")}
                                </Text>
                            </Flex>
                        </Flex>

                        {status && (
                            <Text
                                size="sm"
                                intent={
                                    status.type === COMPONENT_INTENT.SUCCESS
                                        ? COMPONENT_INTENT.PRIMARY
                                        : COMPONENT_INTENT.DANGER
                                }
                            >
                                {status.message}
                            </Text>
                        )}

                        <div className={styles.inputWrapper}>
                            <MessageInput
                                onSend={handleSend}
                                disabled={isLoading}
                            />
                        </div>

                        {history.length > 0 && (
                            <Flex
                                direction="column"
                                gap="3"
                                className={styles.historySection}
                            >
                                <Heading size="sm">
                                    {t("settings.broadcast.history")}
                                </Heading>
                                <Flex direction="column" gap="2">
                                    {history.map((item) => (
                                        <Card
                                            key={item.task_key}
                                            className={styles.historyItem}
                                        >
                                            <Flex
                                                justify="between"
                                                align="center"
                                                gap="3"
                                            >
                                                <Flex direction="column">
                                                    <Text size="sm">
                                                        {item.payload?.text ||
                                                            t(
                                                                "settings.broadcast.mediaBroadcast",
                                                            )}
                                                    </Text>
                                                    <Text
                                                        size="xs"
                                                        intent={
                                                            COMPONENT_INTENT.SECONDARY
                                                        }
                                                    >
                                                        {new Date(
                                                            item.created,
                                                        ).toLocaleString()}
                                                    </Text>
                                                </Flex>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    intent={
                                                        COMPONENT_INTENT.DANGER
                                                    }
                                                    onClick={() =>
                                                        handleDelete(
                                                            item.task_key,
                                                        )
                                                    }
                                                    disabled={isLoadingHistory}
                                                >
                                                    <Trash2
                                                        size={ICON_SIZE.sm}
                                                    />
                                                </Button>
                                            </Flex>
                                        </Card>
                                    ))}
                                </Flex>
                            </Flex>
                        )}
                    </Flex>
                </Card>
            </Flex>
        </Box>
    );
}
