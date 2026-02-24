import { Flex } from "@/components/layout/Flex";
import { ThemeSelector } from "./ThemeSelector/ThemeSelector";

export function AppearanceSettings() {
    return (
        <Flex direction="column" gap="4">
            <Flex direction="column" gap="4" px="4" pb="4" pt="4">
                <ThemeSelector />
            </Flex>
        </Flex>
    );
}
