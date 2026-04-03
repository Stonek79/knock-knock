import { ProfileSettings } from "@/features/settings/ProfileSettings";
import { SettingsLayout } from "@/features/settings/SettingsLayout";

export function ProfileSettingsPage() {
    return (
        <SettingsLayout>
            <ProfileSettings />
        </SettingsLayout>
    );
}
