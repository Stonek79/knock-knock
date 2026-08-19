import {
    Phone,
    PhoneIncoming,
    PhoneMissed,
    PhoneOutgoing,
    Video,
} from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { CALL_STATUS, CALL_TYPE, ICON_SIZE } from "@/lib/constants";
import { callService } from "@/lib/services/call.service";
import { useAuthStore } from "@/stores/auth";
import { SidebarHeader } from "../../../navigation/components/SidebarHeader";
import { useCallStore } from "../../store";
import styles from "./CallsList.module.css";

/**
 * Вспомогательное форматирование длительности звонка в секундах (мм:сс)
 */
function formatDuration(seconds?: number): string {
    if (!seconds || seconds <= 0) {
        return "";
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) {
        return `${secs} с`;
    }
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

/**
 * Компонент боковой панели с интерактивной историей звонков и поддержкой Realtime-обновлений.
 */
export function CallsList() {
    const { t } = useTranslation();
    const pbUser = useAuthStore((state) => state.pbUser);
    const initiateCall = useCallStore((state) => state.initiateCall);

    const logs = useCallStore((state) => state.callLogs);
    const loading = useCallStore((state) => state.loadingCallLogs);
    const fetchCallLogs = useCallStore((state) => state.fetchCallLogs);

    useEffect(() => {
        fetchCallLogs();

        // Подписка на Realtime-события изменений коллекции call_logs
        const unsubscribe = callService.subscribeToIncomingCalls(() => {
            fetchCallLogs();
        });

        return () => {
            unsubscribe();
        };
    }, [fetchCallLogs]);

    const currentUserId = pbUser?.id;

    return (
        <Box className={styles.container}>
            <SidebarHeader title={t("calls.title", "Звонки")} />

            <Box p="4" className={styles.listContent}>
                {loading ? (
                    <Box className={styles.emptyContainer}>
                        <Text size="sm" intent="neutral">
                            {t("common.loading", "Загрузка истории...")}
                        </Text>
                    </Box>
                ) : logs.length === 0 ? (
                    <Box className={styles.emptyContainer}>
                        <Box className={styles.emptyIconBox}>
                            <Phone size={ICON_SIZE.xl} />
                        </Box>
                        <Text
                            size="sm"
                            intent="neutral"
                            className={styles.emptyText}
                        >
                            {t("calls.empty", "История звонков пуста")}
                        </Text>
                    </Box>
                ) : (
                    <Flex direction="column" gap="2" className={styles.logList}>
                        {logs.map((log) => {
                            const isOutgoing = log.initiator === currentUserId;
                            const isMissed =
                                log.status === CALL_STATUS.MISSED ||
                                log.status === CALL_STATUS.REJECTED;

                            // Название комнаты напрямую из типа CallLogsResponse<{ room?: RoomsResponse }>
                            const roomTitle =
                                log.expand?.room?.name ||
                                t("calls.privateRoom", "Приватная комната");

                            const dateStr = log.created
                                ? new Date(log.created).toLocaleDateString(
                                      "ru-RU",
                                      {
                                          day: "numeric",
                                          month: "short",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      },
                                  )
                                : "";

                            return (
                                <Box
                                    key={log.id}
                                    className={styles.logItem}
                                    onClick={() => {
                                        initiateCall(
                                            log.room,
                                            log.type || CALL_TYPE.AUDIO,
                                        );
                                    }}
                                >
                                    <Box className={styles.iconCol}>
                                        {isMissed ? (
                                            <PhoneMissed
                                                size={ICON_SIZE.md}
                                                className={styles.missedIcon}
                                            />
                                        ) : isOutgoing ? (
                                            <PhoneOutgoing
                                                size={ICON_SIZE.md}
                                                className={styles.outgoingIcon}
                                            />
                                        ) : (
                                            <PhoneIncoming
                                                size={ICON_SIZE.md}
                                                className={styles.incomingIcon}
                                            />
                                        )}
                                    </Box>

                                    <Flex
                                        direction="column"
                                        flexGrow="1"
                                        gap="1"
                                    >
                                        <Flex align="center" justify="between">
                                            <Text
                                                size="sm"
                                                weight="semibold"
                                                className={styles.logTitle}
                                            >
                                                {roomTitle}
                                            </Text>
                                            <Text size="xs" intent="neutral">
                                                {dateStr}
                                            </Text>
                                        </Flex>

                                        <Flex align="center" gap="2">
                                            <Badge
                                                variant="soft"
                                                intent={
                                                    isMissed
                                                        ? "error"
                                                        : "primary"
                                                }
                                                className={styles.callTypeBadge}
                                            >
                                                {log.type ===
                                                CALL_TYPE.VIDEO ? (
                                                    <Video size={12} />
                                                ) : (
                                                    <Phone size={12} />
                                                )}
                                                {log.type === CALL_TYPE.VIDEO
                                                    ? t("calls.video", "Видео")
                                                    : t("calls.audio", "Аудио")}
                                            </Badge>

                                            <Text size="xs" intent="neutral">
                                                {isMissed
                                                    ? t(
                                                          "calls.status_missed",
                                                          "Пропущенный",
                                                      )
                                                    : formatDuration(
                                                          log.duration_sec,
                                                      )}
                                            </Text>
                                        </Flex>
                                    </Flex>

                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        intent="neutral"
                                        className={styles.callActionButton}
                                    >
                                        <Phone size={ICON_SIZE.sm} />
                                    </Button>
                                </Box>
                            );
                        })}
                    </Flex>
                )}
            </Box>
        </Box>
    );
}
