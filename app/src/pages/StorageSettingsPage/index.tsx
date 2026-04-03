import { SettingsLayout } from "@/features/settings/SettingsLayout";
import { StorageSettings } from "@/features/settings/StorageSettings";

export function StorageSettingsPage() {
    return (
        <SettingsLayout>
            <StorageSettings />
        </SettingsLayout>
    );
}
