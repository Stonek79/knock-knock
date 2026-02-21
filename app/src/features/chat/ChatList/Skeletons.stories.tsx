import type { Meta, StoryObj } from "@storybook/react";
import { ListLoadingState } from "@/components/ui/Skeleton";
import { ChatListLoadingState } from "./ChatListItemSkeleton";

// Обертка для историй, задающая базовые стили
const meta: Meta = {
    title: "UI/Skeletons",
    component: () => <div />, // Placeholder
    decorators: [
        (Story) => (
            <div className="knock-root" data-theme="emerald" data-mode="dark">
                <div
                    style={{
                        padding: "var(--space-4)",
                        maxWidth: "400px",
                        background: "var(--bg-app)",
                        color: "var(--foreground)",
                    }}
                >
                    <Story />
                </div>
            </div>
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
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
            }}
        >
            <header
                style={{
                    height: "var(--header-height)",
                    borderBottom:
                        "var(--border-width-base) solid var(--glass-border)",
                    display: "flex",
                    alignItems: "center",
                }}
            >
                <span style={{ fontWeight: "var(--font-weight-bold)" }}>
                    Избранное
                </span>
            </header>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                }}
            >
                <div
                    style={{
                        height: "var(--space-10)",
                        width: "60%",
                        background: "var(--glass-bg)",
                        borderRadius: "var(--kk-radius-md)",
                    }}
                />
                <div
                    style={{
                        height: "calc(var(--space-12) + var(--space-2))",
                        width: "40%",
                        background: "var(--glass-hover-bg)",
                        borderRadius: "var(--kk-radius-md)",
                        alignSelf: "flex-end",
                    }}
                />
            </div>
        </div>
    ),
};
