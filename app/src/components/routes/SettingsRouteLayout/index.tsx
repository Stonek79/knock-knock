import { Outlet } from '@tanstack/react-router';
import { SettingsLayout } from '@/features/settings/SettingsLayout';

export function SettingsRouteLayout() {
    return (
        <SettingsLayout>
            <Outlet />
        </SettingsLayout>
    );
}
