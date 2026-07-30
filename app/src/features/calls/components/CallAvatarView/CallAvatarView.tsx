import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import styles from "./CallAvatarView.module.css";

interface CallAvatarViewProps {
    displayName: string;
    avatarUrl?: string | null;
    statusText: string;
    isConnecting?: boolean;
}

/**
 * Центрированное отображение аватара пользователя со свечением и статусом звонка.
 * Использует стандартный UI компонент Avatar и лейаут-примитивы (Flex, Box, Text).
 */
export function CallAvatarView({
    displayName,
    avatarUrl,
    statusText,
    isConnecting = false,
}: CallAvatarViewProps) {
    return (
        <Flex
            direction="column"
            align="center"
            justify="center"
            gap="3"
            className={styles.avatarContainer}
        >
            <Box className={styles.avatarWrapper}>
                <Box className={styles.glowRing} />
                <Avatar
                    src={avatarUrl ?? undefined}
                    name={displayName}
                    size="xxl"
                    className={styles.avatarElement}
                />
            </Box>

            <Text
                as="h2"
                size="xl"
                weight="semibold"
                className={styles.displayName}
            >
                {displayName}
            </Text>

            <Flex
                align="center"
                justify="center"
                gap="1"
                className={styles.statusText}
            >
                <Text size="sm" color="muted">
                    {statusText}
                </Text>
                {isConnecting && (
                    <Box as="span" className={styles.pulseDots}>
                        <Text as="span" color="muted">
                            •
                        </Text>
                        <Text as="span" color="muted">
                            •
                        </Text>
                        <Text as="span" color="muted">
                            •
                        </Text>
                    </Box>
                )}
            </Flex>
        </Flex>
    );
}
