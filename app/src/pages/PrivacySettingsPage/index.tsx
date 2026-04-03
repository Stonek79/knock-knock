import { PrivacySettings } from "@/features/settings/PrivacySettings";
import { SettingsLayout } from "@/features/settings/SettingsLayout";

export function PrivacySettingsPage() {
    return (
        <SettingsLayout>
            <PrivacySettings />
        </SettingsLayout>
    );
}
