import { Phone, Trash2, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "../roomheader.module.css";

interface RoomHeaderActionsProps {
    /** Флаг эфемерного чата */
    isEphemeral?: boolean;
    /** Обработчик завершения сессии */
    onEndSession?: () => void;
    /** Флаг загрузки при завершении */
    ending?: boolean;
}

/**
 * Группа кнопок действий в заголовке чата.
 * Использует наши кастомные IconButton, иконки через ICON_SIZE.
 */
export function RoomHeaderActions({
    isEphemeral,
    onEndSession,
    ending,
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
            >
                <Phone size={ICON_SIZE.sm} />
            </IconButton>
            <IconButton
                variant="ghost"
                size="md"
                shape="round"
                className={styles.actionButton}
                aria-label={t("chat.videoCall", "Видеозвонок")}
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
        </Flex>
    );
}
