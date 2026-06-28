import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { MessageBubble } from "@/features/chat/message/components/MessageBubble";
import { COMPONENT_INTENT, ICON_SIZE } from "@/lib/constants";
import { mediaRepository } from "@/lib/repositories/media.repository";
import { broadcastTaskPayloadSchema } from "@/lib/schemas/broadcast";
import type {
    Attachment,
    BroadcastTaskPayload,
    TaskQueueResponse,
} from "@/lib/types";
import styles from "./broadcast-history.module.css";

interface BroadcastHistoryProps {
    /** Список отправленных задач рассылки */
    history: TaskQueueResponse[];
    /** Колбэк при клике на удаление рассылки */
    onDeleteClick: (id: string) => void;
    /** Флаг загрузки истории */
    isLoadingHistory: boolean;
}

/**
 * Безопасный рантайм-декодер для приведения неизвестного payload к структуре BroadcastTaskPayload.
 * Использует Zod-схему для проверки структуры и соответствия константам.
 */
function parseBroadcastPayload(payload: unknown): BroadcastTaskPayload | null {
    const result = broadcastTaskPayloadSchema.safeParse(payload);
    if (result.success) {
        return result.data;
    }
    return null;
}

/**
 * Компонент списка истории рассылок.
 * Рендерит сообщения рассылок в виде прокручиваемой ленты.
 */
export function BroadcastHistory({
    history,
    onDeleteClick,
    isLoadingHistory,
}: BroadcastHistoryProps) {
    const { t } = useTranslation();

    if (history.length === 0) {
        return (
            <Flex
                direction="column"
                align="center"
                justify="center"
                className={styles.emptyState}
            >
                <Text intent={COMPONENT_INTENT.SECONDARY}>
                    {t(
                        "settings.broadcast.emptyHistory",
                        "История рассылок пуста",
                    )}
                </Text>
            </Flex>
        );
    }

    return (
        <Box className={styles.scrollArea}>
            <Flex direction="column" gap="4" className={styles.list}>
                {history.map((item) => {
                    const payload = parseBroadcastPayload(item.payload);
                    const attachments: Attachment[] | null =
                        payload?.mediaAttachments
                            ? payload.mediaAttachments.map((att) => {
                                  return {
                                      id: att.id,
                                      file_name: att.file_name,
                                      file_size: att.file_size,
                                      content_type: att.content_type,
                                      type: att.type,
                                      url: mediaRepository.getSystemFileUrl(
                                          att.id,
                                          att.file_name,
                                      ),
                                  };
                              })
                            : null;

                    return (
                        <Card
                            key={item.task_key}
                            className={styles.historyItem}
                        >
                            <Flex
                                justify="between"
                                align="start"
                                gap="3"
                                width="100%"
                            >
                                <div className={styles.bubblePreviewWrapper}>
                                    <MessageBubble
                                        content={payload?.text || null}
                                        isOwn={true}
                                        userId={payload?.adminId || ""}
                                        timestamp={item.created}
                                        attachments={attachments}
                                        isSystem={true}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    intent={COMPONENT_INTENT.DANGER}
                                    onClick={() => {
                                        onDeleteClick(item.task_key);
                                    }}
                                    disabled={isLoadingHistory}
                                    className={styles.deleteBtn}
                                >
                                    <Trash2 size={ICON_SIZE.sm} />
                                </Button>
                            </Flex>
                        </Card>
                    );
                })}
            </Flex>
        </Box>
    );
}
