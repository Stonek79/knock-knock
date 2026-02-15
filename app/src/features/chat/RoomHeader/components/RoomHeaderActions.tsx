import { Flex } from "@radix-ui/themes";
import { Phone, Trash2, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
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
 */
export function RoomHeaderActions({
    isEphemeral,
    onEndSession,
    ending,
}: RoomHeaderActionsProps) {
    const { t } = useTranslation();

    return (
        <Flex align="center" gap="1">
            <Button
                variant="ghost"
                color="gray"
                className={styles.actionButton}
            >
                <Phone size={20} />
            </Button>
            <Button
                variant="ghost"
                color="gray"
                className={styles.actionButton}
            >
                <Video size={20} />
            </Button>

            {isEphemeral && onEndSession && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEndSession}
                    disabled={ending}
                    className={styles.endSessionButton}
                >
                    <Trash2 size={16} />
                    {t("chat.endSession")}
                </Button>
            )}
        </Flex>
    );
}
