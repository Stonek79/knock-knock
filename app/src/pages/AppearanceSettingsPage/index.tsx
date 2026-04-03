import { AppearanceSettings } from "@/features/settings/AppearanceSettings";
import { SettingsLayout } from "@/features/settings/SettingsLayout";

/**
 * Страница настроек внешнего вида.
 * Обертка для фичи AppearanceSettings.
 */
export function AppearanceSettingsPage() {
    return (
        <SettingsLayout>
            <AppearanceSettings />
        </SettingsLayout>
    );
}
