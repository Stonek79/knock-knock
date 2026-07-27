import { PhoneIncoming, PhoneOff, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { CALL_TYPE, ICON_SIZE } from "@/lib/constants";
import { useCallStore } from "../../store";
import { parseCallError } from "../../utils";
import { startRingtone, stopRingtone } from "../../utils/ringtone";
import styles from "./IncomingCallAlert.module.css";

/**
 * Компонент окна входящего звонка в стиле Telegram.
 * Использует кастомные UI-компоненты (Dialog, Card, Avatar, Badge, Button)
 * с поддержкой общей темы приложения и встроенного воспроизведения рингтона.
 */
export function IncomingCallAlert() {
    const { t } = useTranslation();
    const isIncoming = useCallStore((state) => state.isIncoming);
    const callType = useCallStore((state) => state.callType);
    const acceptCall = useCallStore((state) => state.acceptCall);
    const rejectCall = useCallStore((state) => state.rejectCall);
    const toast = useToast();

    // Запуск/остановка рингтона и 45-секундный таймаут автоотклонения вызова
    useEffect(() => {
        let timeoutId: number | null = null;

        if (isIncoming) {
            startRingtone();
            timeoutId = window.setTimeout(() => {
                stopRingtone();
                useCallStore.getState().rejectCall();
            }, 45000);
        } else {
            stopRingtone();
        }

        return () => {
            stopRingtone();
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
        };
    }, [isIncoming]);

    if (!isIncoming) {
        return null;
    }

    const handleOpen = (open: boolean) => {
        if (!open) {
            stopRingtone();
            rejectCall();
        }
    };

    const handleAccept = async () => {
        stopRingtone();
        try {
            await acceptCall();
        } catch (e: unknown) {
            const message = parseCallError(e, t);
            toast({
                title: t("calls.error", "Ошибка звонка"),
                description: message,
                variant: "error",
            });
        }
    };

    const handleReject = () => {
        stopRingtone();
        rejectCall();
    };

    return (
        <Dialog.Root open={isIncoming} onOpenChange={handleOpen}>
            <Dialog.Content
                hideCloseButton
                className={styles.incomingCallContent}
            >
                <Card variant="glass" className={styles.alertCard}>
                    <Box className={styles.avatarContainer}>
                        <Box className={styles.avatarPulse1} />
                        <Box className={styles.avatarPulse2} />
                        <Box className={styles.avatarPulse3} />
                        <Avatar
                            size="xxl"
                            fallback={
                                callType === CALL_TYPE.VIDEO ? "📹" : "📞"
                            }
                            className={styles.incognitoAvatar}
                        />
                    </Box>

                    <Badge
                        intent="primary"
                        variant="soft"
                        className={styles.e2eeBadge}
                    >
                        <ShieldCheck size={ICON_SIZE.sm} />
                        {t("calls.e2ee_label", "Зашифрованный E2EE-звонок")}
                    </Badge>

                    <header className={styles.alertHeader}>
                        <Dialog.Title asChild>
                            <Heading
                                as="h2"
                                size="xl"
                                className={styles.alertTitle}
                            >
                                {callType === CALL_TYPE.VIDEO
                                    ? t(
                                          "calls.incoming_video_title",
                                          "Входящий видеовызов",
                                      )
                                    : t(
                                          "calls.incoming_audio_title",
                                          "Входящий аудиовызов",
                                      )}
                            </Heading>
                        </Dialog.Title>
                        <Dialog.Description asChild>
                            <Text
                                as="p"
                                intent="neutral"
                                size="md"
                                className={styles.alertSubtitle}
                            >
                                {t(
                                    "calls.incoming_subtitle",
                                    "Приватное E2EE соединение...",
                                )}
                            </Text>
                        </Dialog.Description>
                    </header>

                    <footer className={styles.alertActions}>
                        <Button
                            size="lg"
                            intent="error"
                            variant="solid"
                            onClick={handleReject}
                            className={`${styles.actionButton} ${styles.rejectButton}`}
                            aria-label={t("calls.reject", "Отклонить")}
                        >
                            <PhoneOff size={ICON_SIZE.md} />
                            {t("calls.reject", "Отклонить")}
                        </Button>

                        <Button
                            size="lg"
                            intent="success"
                            variant="solid"
                            onClick={handleAccept}
                            className={`${styles.actionButton} ${styles.acceptButton}`}
                            aria-label={t("calls.accept", "Принять")}
                        >
                            <PhoneIncoming size={ICON_SIZE.md} />
                            {t("calls.accept", "Принять")}
                        </Button>
                    </footer>
                </Card>
            </Dialog.Content>
        </Dialog.Root>
    );
}
