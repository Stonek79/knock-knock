import { Box, Flex } from '@radix-ui/themes';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Sidebar } from '@/components/chat/Sidebar';

export const Route = createFileRoute('/chat')({
    component: ChatLayout,
});

function ChatLayout() {
    return (
        <Flex style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            {/* Sidebar (WhatsApp style) */}
            <Sidebar />

            {/* Main Chat Area */}
            <Box
                style={{
                    flex: 1,
                    position: 'relative',
                    background: 'var(--gray-2)',
                }}
            >
                <Outlet />
            </Box>
        </Flex>
    );
}
