import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { ListLoadingState } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { ChatListLoadingState } from "./ChatListItemSkeleton";

// Обертка для историй, задающая базовые стили
const meta: Meta = {
    title: "UI/Skeletons",
    component: () => <Box />, // Placeholder
    decorators: [
        (Story) => (
            <Box className="nemo-root" data-theme="emerald" data-mode="dark">
                <Box
                    style={{
                        padding: "var(--space-4)",
                        maxWidth: "400px",
                        background: "var(--bg-app)",
                        color: "var(--foreground)",
                    }}
                >
                    <Story />
                </Box>
            </Box>
        ),
    ],
};

export default meta;

export const ChatList: StoryObj = {
    render: () => <ChatListLoadingState count={5} />,
};

export const CallsList: StoryObj = {
    render: () => <ListLoadingState count={5} />,
};

export const ContactsList: StoryObj = {
    render: () => <ListLoadingState count={5} />,
};

export const FavoritesRoom: StoryObj = {
    render: () => (
        <Flex direction="column" gap="4">
            <Flex
                align="center"
                style={{
                    height: "var(--header-height)",
                    borderBottom:
                        "var(--border-width-base) solid var(--glass-border)",
                }}
            >
                <Text weight="bold">Избранное</Text>
            </Flex>
            <Flex direction="column" gap="2">
                <Box
                    style={{
                        height: "var(--space-10)",
                        width: "60%",
                        background: "var(--glass-bg)",
                        borderRadius: "var(--kk-radius-md)",
                    }}
                />
                <Box
                    style={{
                        height: "calc(var(--space-12) + var(--space-2))",
                        width: "40%",
                        background: "var(--glass-hover-bg)",
                        borderRadius: "var(--kk-radius-md)",
                        alignSelf: "flex-end",
                    }}
                />
            </Flex>
        </Flex>
    ),
};
