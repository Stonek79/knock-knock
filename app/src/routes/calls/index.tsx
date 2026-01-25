import { createFileRoute } from '@tanstack/react-router';
import { CallsPage } from '@/components/pages/CallsPage';

export const Route = createFileRoute('/calls/')({
    component: CallsPage,
});
