import { Flex } from "@/components/layout/Flex";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
import { ThemeSelector } from "./ThemeSelector/ThemeSelector";

export function AppearanceSettings() {
    return (
        <Flex direction="column" gap="4">
            <SettingsHeader
                title="Внешний вид"
                titleKey="settings.appearance"
            />
            <Flex direction="column" gap="4" px="4" pb="4">
                <ThemeSelector />
            </Flex>
        </Flex>
    );
}
