import { Box, Flex, Skeleton } from "@radix-ui/themes";

/**
 * Скелетон для элемента списка чатов.
 * Имитирует аватар, имя и последнее сообщение.
 */
export function ChatListItemSkeleton() {
    return (
        <Flex p="3" gap="3" align="center">
            <Box width="48px" height="48px">
                <Skeleton width="100%" height="100%" />
            </Box>
            <Box flexGrow="1">
                <Flex justify="between" mb="1">
                    <Skeleton width="100px" height="16px" />
                    <Skeleton width="40px" height="12px" />
                </Flex>
                <Skeleton width="180px" height="14px" />
            </Box>
        </Flex>
    );
}

/**
 * Группа скелетонов для начальной загрузки списка.
 */
export function ChatListLoadingState({ count = 6 }: { count?: number }) {
    return (
        <Flex direction="column" gap="0">
            {Array.from({ length: count }).map((_, i) => {
                const kIndex = i;
                return <ChatListItemSkeleton key={`skeleton-${kIndex}`} />;
            })}
        </Flex>
    );
}
