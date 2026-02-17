import { Box, Flex, Skeleton, Text } from "@radix-ui/themes";
import { FULL_APP_NAME } from "@/lib/constants";
import styles from "./skeletons.module.css";

/**
 * Скелетон для элемента списка звонков.
 */
export function CallItemSkeleton() {
    return (
        <Flex p="3" gap="3" align="center">
            <Box width="40px" height="40px" className={styles.radius}>
                <Skeleton width="100%" height="100%" />
            </Box>
            <Box flexGrow="1">
                <Flex justify="between" mb="1">
                    <Skeleton width="120px" height="16px" />
                    <Skeleton width="60px" height="12px" />
                </Flex>
                <Skeleton width="100px" height="14px" />
            </Box>
            <Box width="32px" height="32px" className={styles.radius}>
                <Skeleton width="100%" height="100%" />
            </Box>
        </Flex>
    );
}

/**
 * Скелетон для элемента списка контактов.
 */
export function ContactItemSkeleton() {
    return (
        <Flex p="3" gap="3" align="center">
            <Box width="48px" height="48px" className={styles.radius}>
                <Skeleton width="100%" height="100%" />
            </Box>
            <Box flexGrow="1">
                <Skeleton width="140px" height="18px" mb="1" />
                <Skeleton width="100px" height="14px" />
            </Box>
        </Flex>
    );
}

/**
 * Группа скелетонов для звонков.
 */
export function CallsLoadingState({ count = 8 }: { count?: number }) {
    return (
        <Flex direction="column" gap="0">
            {Array.from({ length: count }).map((_, i) => {
                const kIndex = i;
                return <CallItemSkeleton key={`c-s-${kIndex}`} />;
            })}
        </Flex>
    );
}

/**
 * Группа скелетонов для контактов.
 */
export function ContactsLoadingState({ count = 10 }: { count?: number }) {
    return (
        <Flex direction="column" gap="0">
            {Array.from({ length: count }).map((_, i) => {
                const kIndex = i;
                return <ContactItemSkeleton key={`u-s-${kIndex}`} />;
            })}
        </Flex>
    );
}

/**
 * Глобальный скелетон для всего приложения (сайдбар + контент).
 * Используется в AuthLayout во время ожидания проверки сессии.
 * Оптимизирован: заголовок Knock Knock отображается сразу текстом.
 */
export function MainLayoutSkeleton() {
    return (
        <Flex height="100vh" width="100vw" overflow="hidden">
            {/* Sidebar Skeleton */}
            <Flex direction="column" className={styles.sidebar} width="350px">
                <Box p="4" className={styles.MLSkeleton}>
                    <Text weight="bold" size="5">
                        {FULL_APP_NAME}
                    </Text>
                </Box>
                <Flex direction="column" p="3" gap="3">
                    {[...Array(8)].map((_, i) => {
                        const kIndex = i;
                        return (
                            <Flex
                                key={`sid-item-${kIndex}`}
                                gap="3"
                                align="center"
                            >
                                <Skeleton
                                    width="48px"
                                    height="48px"
                                    className={styles.radius}
                                />
                                <Box style={{ flexGrow: 1 }}>
                                    <Skeleton
                                        width="60%"
                                        height="16px"
                                        mb="2"
                                    />
                                    <Skeleton width="40%" height="12px" />
                                </Box>
                            </Flex>
                        );
                    })}
                </Flex>
            </Flex>

            {/* Content Skeleton */}
            <Box style={{ flexGrow: 1 }} p="4">
                <Flex direction="column" gap="4">
                    <Skeleton width="200px" height="32px" />
                    <Box mt="4">
                        <Skeleton width="100%" height="200px" />
                    </Box>
                </Flex>
            </Box>
        </Flex>
    );
}
