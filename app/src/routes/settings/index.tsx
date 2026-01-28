import { createFileRoute } from '@tanstack/react-router';
import { SettingsIndexPage } from '@/components/routes/SettingsIndexPage';

export const Route = createFileRoute('/settings/')({
    component: SettingsIndexPage,
});
