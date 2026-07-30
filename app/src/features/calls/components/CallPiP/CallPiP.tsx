import { Maximize2, Mic, MicOff, PhoneOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import { ICON_SIZE } from "@/lib/constants";
import styles from "./CallPiP.module.css";

interface CallPiPProps {
    displayName: string;
    avatarUrl?: string | null;
    statusText: string;
    isMuted: boolean;
    onExpand: () => void;
    onToggleMute: () => void;
    onEndCall: () => void;
}

/**
 * Плавающее мини-окно свертывания (Picture-in-Picture).
 * Использование лейаут-примитивов (Flex, Box, Text), компонента Avatar и i18n локализации.
 */
export function CallPiP({
    displayName,
    avatarUrl,
    statusText,
    isMuted,
    onExpand,
    onToggleMute,
    onEndCall,
}: CallPiPProps) {
    const { t } = useTranslation();

    return (
        <Box
            tabIndex={0}
            role="button"
            className={styles.pipWidget}
            onClick={onExpand}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onExpand();
                }
            }}
        >
            <Flex align="center" justify="between" className={styles.pipHeader}>
                <Flex align="center" gap="2" className={styles.pipInfo}>
                    <Avatar
                        src={avatarUrl ?? undefined}
                        name={displayName}
                        size="sm"
                    />
                    <Flex direction="column" className={styles.pipText}>
                        <Text
                            size="sm"
                            weight="semibold"
                            className={styles.pipName}
                        >
                            {displayName}
                        </Text>
                        <Text
                            size="xs"
                            color="muted"
                            className={styles.pipStatus}
                        >
                            {statusText}
                        </Text>
                    </Flex>
                </Flex>

                <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        onExpand();
                    }}
                    title={t("calls.maximize", "Развернуть")}
                >
                    <Maximize2 size={ICON_SIZE.xs} />
                </button>
            </Flex>

            <Flex
                align="center"
                justify="between"
                gap="2"
                className={styles.pipActions}
            >
                <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleMute();
                    }}
                    title={
                        isMuted
                            ? t("calls.unmute", "Включить звук")
                            : t("calls.mute", "Без звука")
                    }
                >
                    {isMuted ? (
                        <MicOff size={ICON_SIZE.xs} />
                    ) : (
                        <Mic size={ICON_SIZE.xs} />
                    )}
                </button>

                <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.endCall}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onEndCall();
                    }}
                    title={t("calls.end_call", "Завершить")}
                >
                    <PhoneOff size={ICON_SIZE.xs} />
                </button>
            </Flex>
        </Box>
    );
}
