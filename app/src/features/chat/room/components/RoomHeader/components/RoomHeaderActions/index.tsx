import { Info, Phone, Trash2, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ICON_SIZE } from "@/lib/constants";
import styles from "./room-header-actions.module.css";

interface RoomHeaderActionsProps {
    /** Флаг эфемерного чата */
    isEphemeral?: boolean;
    /** Обработчик завершения сессии */
    onEndSession?: () => void;
    /** Флаг загрузки при завершении */
    ending?: boolean;
    /** Обработчик открытия инфо-панели */
    onInfoClick?: () => void;
    /** Обработчик аудиозвонка */
    onAudioCallClick?: () => void;
    /** Обработчик видеозвонка */
    onVideoCallClick?: () => void;
}

/**
 * Группа кнопок действий в заголовке чата.
 * Использует наши кастомные IconButton, иконки через ICON_SIZE.
 */
export function RoomHeaderActions({
    isEphemeral,
    onEndSession,
    ending,
    onInfoClick,
    onAudioCallClick,
    onVideoCallClick,
}: RoomHeaderActionsProps) {
    const { t } = useTranslation();

    return (
        <Flex align="center" gap="1">
            <IconButton
                variant="ghost"
                size="md"
                shape="round"
                className={styles.actionButton}
                aria-label={t("chat.call", "Позвонить")}
                onClick={onAudioCallClick}
            >
                <Phone size={ICON_SIZE.sm} />
            </IconButton>
            <IconButton
                variant="ghost"
                size="md"
                shape="round"
                className={styles.actionButton}
                aria-label={t("chat.videoCall", "Видеозвонок")}
                onClick={onVideoCallClick}
            >
                <Video size={ICON_SIZE.sm} />
            </IconButton>

            {isEphemeral && onEndSession && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEndSession}
                    disabled={ending}
                    className={styles.endSessionButton}
                >
                    <Trash2 size={ICON_SIZE.sm} />
                    {t("chat.endSession")}
                </Button>
            )}

            {onInfoClick && (
                <IconButton
                    variant="ghost"
                    size="md"
                    shape="round"
                    onClick={onInfoClick}
                    className={styles.actionButton}
                    aria-label={t("chat.group.info", "Информация")}
                >
                    <Info size={ICON_SIZE.sm} />
                </IconButton>
            )}
        </Flex>
    );
}
