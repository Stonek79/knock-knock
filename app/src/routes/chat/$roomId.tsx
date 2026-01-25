import { createFileRoute } from '@tanstack/react-router';
import { ChatRoom } from '@/components/chat/ChatRoom';

export const Route = createFileRoute('/chat/$roomId')({
    component: ChatRoom,
});
