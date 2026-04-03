import { AccountSettings } from "@/features/settings/AccountSettings";
import { SettingsLayout } from "@/features/settings/SettingsLayout";

/**
 * Страница настроек аккаунта.
 * Служит оберткой для фичи AccountSettings.
 */
export function AccountSettingsPage() {
    return (
        <SettingsLayout>
            <AccountSettings />
        </SettingsLayout>
    );
}
