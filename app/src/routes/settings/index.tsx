import { Container, Flex, Heading } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { ThemeSelector } from "../../features/settings/ThemeSelector";

export const Route = createFileRoute("/settings/")({
    component: SettingsPage,
});

function SettingsPage() {
    return (
        <Container size="2" p="4">
            <Flex direction="column" gap="6">
                <Heading>Настройки</Heading>
                <ThemeSelector />
            </Flex>
        </Container>
    );
}
