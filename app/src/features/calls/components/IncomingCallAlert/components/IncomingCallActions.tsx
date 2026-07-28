import { PhoneIncoming, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { ICON_SIZE } from "@/lib/constants";
import styles from "./IncomingCallActions.module.css";

interface IncomingCallActionsProps {
    isActive: boolean;
    isMutedRingtone: boolean;
    onToggleMute: () => void;
    onReject: () => void;
    onAccept: () => void;
}

export function IncomingCallActions({
    isActive,
    isMutedRingtone,
    onToggleMute,
    onReject,
    onAccept,
}: IncomingCallActionsProps) {
    const { t } = useTranslation();

    return (
        <footer className={styles.alertActionsDock}>
            {/* Кнопка "Без звука" */}
            <Box className={styles.actionItem}>
                <Button
                    size="md"
                    intent="neutral"
                    variant="ghost"
                    onClick={onToggleMute}
                    className={styles.muteButton}
                    aria-label={t("calls.mute", "Без звука")}
                >
                    {isMutedRingtone ? (
                        <VolumeX size={ICON_SIZE.md} />
                    ) : (
                        <Volume2 size={ICON_SIZE.md} />
                    )}
                </Button>
                <Text size="xs" className={styles.actionLabel}>
                    {isMutedRingtone
                        ? t("calls.unmute", "Включить звук")
                        : t("calls.mute", "Без звука")}
                </Text>
            </Box>

            {/* Кнопка "Отклонить" */}
            <Box className={styles.actionItem}>
                <Button
                    size="lg"
                    intent="error"
                    variant="solid"
                    onClick={onReject}
                    className={styles.roundRejectButton}
                    aria-label={t("calls.reject", "Отклонить")}
                >
                    <PhoneOff size={ICON_SIZE.lg} />
                </Button>
                <Text size="xs" className={styles.actionLabel}>
                    {t("calls.reject", "Отклонить")}
                </Text>
            </Box>

            {/* Кнопка "Принять" */}
            <Box className={styles.actionItem}>
                <Button
                    size="lg"
                    intent="success"
                    variant="solid"
                    onClick={onAccept}
                    className={styles.roundAcceptButton}
                    aria-label={t("calls.accept", "Принять")}
                >
                    <PhoneIncoming size={ICON_SIZE.lg} />
                </Button>
                <Text size="xs" className={styles.actionLabel}>
                    {isActive
                        ? t("calls.accept", "Завершить и ответить")
                        : t("calls.accept", "Принять")}
                </Text>
            </Box>
        </footer>
    );
}
