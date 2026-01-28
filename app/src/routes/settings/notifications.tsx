import { createFileRoute } from '@tanstack/react-router';
import { NotificationSettings } from '@/features/settings/NotificationSettings';

export const Route = createFileRoute('/settings/notifications')({
    component: NotificationSettings,
});
