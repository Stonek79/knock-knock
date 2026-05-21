import { Camera, FileText, Mic, Video } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Text } from "@/components/ui/Text";
import { ATTACHMENT_TYPES, ICON_SIZE } from "@/lib/constants";
import type { Attachment } from "@/lib/types";
import { getUserColor } from "@/lib/utils/colors";
import styles from "./reply-block.module.css";

export interface ReplyBlockData {
    id: string;
    senderName: string;
    content?: string | null;
    attachments?: Attachment[] | null;
    isDeleted?: boolean;
}

interface ReplyBlockProps {
    replyData: ReplyBlockData;
    onClick?: (messageId: string) => void;
}

export function ReplyBlock({ replyData, onClick }: ReplyBlockProps) {
    const { t } = useTranslation();

    // Цвет полоски и имени определяется динамически, как в бабле
    const userColor = getUserColor(replyData.senderName);

    // Определяем иконку и подпись, если цитируется медиа или файл
    const { icon: Icon, text: mediaText } = useMemo(() => {
        if (!replyData.attachments || replyData.attachments.length === 0) {
            return { icon: null, text: null };
        }

        const firstAtt = replyData.attachments[0];
        switch (firstAtt.type) {
            case ATTACHMENT_TYPES.IMAGE:
                return { icon: Camera, text: t("chat.photo", "Фото") };
            case ATTACHMENT_TYPES.VIDEO:
                return { icon: Video, text: t("chat.video", "Видео") };
            case ATTACHMENT_TYPES.AUDIO:
                return {
                    icon: Mic,
                    text: t("chat.voice", "Голосовое сообщение"),
                };
            default:
                return { icon: FileText, text: t("chat.file", "Файл") };
        }
    }, [replyData.attachments, t]);

    const isDeleted = replyData.isDeleted;

    // Определяем текст в зависимости от контента и статуса удаления
    const displayContent = isDeleted
        ? t("chat.messageDeleted", "Сообщение удалено")
        : replyData.content || mediaText || t("chat.message", "Сообщение");

    const ActiveIcon = isDeleted ? null : Icon;

    return (
        <Box
            className={styles.replyWrapper}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(replyData.id);
            }}
        >
            <Box
                className={styles.replyLine}
                style={userColor ? { backgroundColor: userColor } : undefined}
            />
            <Text
                className={styles.senderName}
                style={userColor ? { color: userColor } : undefined}
            >
                {replyData.senderName}
            </Text>
            <Flex align="center" gap="1" className={styles.contentWrapper}>
                {ActiveIcon && (
                    <ActiveIcon
                        size={ICON_SIZE.xs}
                        className={styles.mediaIcon}
                        style={userColor ? { color: userColor } : undefined}
                    />
                )}
                <Text className={styles.textContent}>{displayContent}</Text>
            </Flex>
        </Box>
    );
}
