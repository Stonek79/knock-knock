import { SecuritySettings } from "@/features/settings/SecuritySettings";
import { SettingsLayout } from "@/features/settings/SettingsLayout";

export function SecuritySettingsPage() {
    return (
        <SettingsLayout>
            <SecuritySettings />
        </SettingsLayout>
    );
}
