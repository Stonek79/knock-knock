import { NotificationSettings } from "@/features/settings/NotificationSettings";
import { SettingsLayout } from "@/features/settings/SettingsLayout";

/**
 * Страница настроек уведомлений.
 */
export function NotificationSettingsPage() {
    return (
        <SettingsLayout>
            <NotificationSettings />
        </SettingsLayout>
    );
}
