import { createFileRoute } from '@tanstack/react-router';
import { ChatRoom } from '@/features/chat/ChatRoom';

export const Route = createFileRoute('/chat/$roomId')({
    component: ChatRoom,
});
