import { Flex } from "@/components/layout/Flex";
import { ListItemSkeleton } from "@/components/ui/Skeleton";

/**
 * Скелетон для элемента списка чатов.
 * Теперь использует общий ListItemSkeleton из UI-компонента.
 */
export function ChatListItemSkeleton() {
    return <ListItemSkeleton />;
}

/**
 * Группа скелетонов для начальной загрузки списка.
 */
export function ChatListLoadingState({ count = 6 }: { count?: number }) {
    return (
        <Flex direction="column" gap="0">
            {Array.from({ length: count }, (_, i) => (
                <ChatListItemSkeleton key={`chat-skeleton-${i + 1}`} />
            ))}
        </Flex>
    );
}
