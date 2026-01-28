import { createFileRoute } from '@tanstack/react-router';
import { SettingsRouteLayout } from '@/components/routes/SettingsRouteLayout';

/**
 * Маршрут настроек.
 * Содержит вложенные маршруты для каждого раздела.
 */
export const Route = createFileRoute('/settings')({
    component: SettingsRouteLayout,
});
