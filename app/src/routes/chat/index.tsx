import { createFileRoute } from '@tanstack/react-router';
import { ChatIndex } from '@/components/chat/ChatIndex';

export const Route = createFileRoute('/chat/')({
    component: ChatIndex,
});
