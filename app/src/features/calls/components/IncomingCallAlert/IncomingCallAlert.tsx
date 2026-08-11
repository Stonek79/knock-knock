import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { CALL_TYPE } from "@/lib/constants";
import { useCallStore } from "../../store";
import { startRingtone, stopRingtone } from "../../utils/ringtone";
import { parseCallError } from "../../utils/utils";
import { IncomingCallActions } from "./components/IncomingCallActions";
import { IncomingCallAvatar } from "./components/IncomingCallAvatar";
import { IncomingCallBadges } from "./components/IncomingCallBadges";
import styles from "./IncomingCallAlert.module.css";

/**
 * Премиальный декомпозированный интерфейс входящего вызова в стиле Cosmic Neon Glassmorphism.
 * Содержит 3D-ауру аватара, плавающий стеклянный экшен-док и микроанимации.
 */
export function IncomingCallAlert() {
    const { t } = useTranslation();
    const incomingSession = useCallStore((state) => state.incomingSession);
    const activeSession = useCallStore((state) => state.activeSession);
    const isMutedRingtone = useCallStore((state) => state.isMutedRingtone);
    const toggleMuteRingtone = useCallStore(
        (state) => state.toggleMuteRingtone,
    );
    const acceptCall = useCallStore((state) => state.acceptCall);
    const endAndAcceptCall = useCallStore((state) => state.endAndAcceptCall);
    const rejectCall = useCallStore((state) => state.rejectCall);
    const toast = useToast();

    const isIncoming = incomingSession !== null;
    const isActive = activeSession !== null;
    const callType = incomingSession?.type ?? CALL_TYPE.VIDEO;
    const participantName = t(
        "calls.privateParticipant",
        "Анонимный собеседник",
    );

    // Запуск/остановка рингтона и 45-секундный таймаут автоотклонения с отметкой MISSED
    useEffect(() => {
        let timeoutId: number | null = null;

        if (isIncoming) {
            startRingtone();
            timeoutId = window.setTimeout(() => {
                stopRingtone();
                useCallStore.getState().missCall();
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

    const handleAccept = async () => {
        stopRingtone();
        try {
            if (isActive) {
                await endAndAcceptCall();
            } else {
                await acceptCall();
            }
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

    const handleToggleMute = () => {
        toggleMuteRingtone();
    };

    return (
        <Box className={styles.overlay}>
            {/* Декоративные эмбиент-пятна космического свечения */}
            <Box className={styles.ambientSpot1} />
            <Box className={styles.ambientSpot2} />

            <Box className={styles.alertCard}>
                <IncomingCallAvatar displayName={participantName} />

                {/* Е2ЕЕ Шифрование / Бейдж Второй линии */}
                <IncomingCallBadges isActive={isActive} />

                {/* Заголовок и статус вызова */}
                <header className={styles.alertHeader}>
                    <Heading as="h2" size="xl" className={styles.alertTitle}>
                        {callType === CALL_TYPE.VIDEO
                            ? t("calls.video", "Входящий видеовызов")
                            : t("calls.audio", "Входящий аудиовызов")}
                    </Heading>
                    <Box className={styles.subtitleRow}>
                        <span className={styles.statusDotLive} />
                        <Text as="p" size="sm" className={styles.alertSubtitle}>
                            {isActive
                                ? t(
                                      "calls.secondLine",
                                      "Ответить и завершить текущий?",
                                  )
                                : t(
                                      "calls.incoming_subtitle",
                                      "Приватное E2EE соединение...",
                                  )}
                        </Text>
                    </Box>
                </header>

                {/* Плавающий стеклянный экшен-док с круглыми 3D кнопками */}
                <IncomingCallActions
                    isActive={isActive}
                    isMutedRingtone={isMutedRingtone}
                    onToggleMute={handleToggleMute}
                    onReject={handleReject}
                    onAccept={handleAccept}
                />
            </Box>
        </Box>
    );
}
