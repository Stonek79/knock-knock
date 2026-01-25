import { Box, Flex } from '@radix-ui/themes';
import { Outlet } from '@tanstack/react-router';
import { Sidebar } from '@/components/chat/Sidebar';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/useMediaQuery';
import styles from '../chat.module.css';

/**
 * Layout маршрута /chat.
 * На десктопе: Sidebar слева + Main Chat Area справа.
 * На мобильных: Только Main Chat Area, Sidebar скрыт (используется как отдельный экран списка).
 */
export function ChatLayout() {
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    return (
        <Flex className={isMobile ? styles.containerMobile : styles.container}>
            {/* Sidebar (WhatsApp style) — скрыт на мобильных */}
            {!isMobile && <Sidebar />}

            {/* Main Chat Area */}
            <Box className={styles.chatArea}>
                <Outlet />
            </Box>
        </Flex>
    );
}
