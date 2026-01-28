import { createFileRoute } from '@tanstack/react-router';
import { PrivateLayout } from '@/components/routes/PrivateLayout';

/**
 * Layout для раздела /private.
 * Пробрасывает контент к дочерним роутам.
 */
export const Route = createFileRoute('/private')({
    component: PrivateLayout,
});
