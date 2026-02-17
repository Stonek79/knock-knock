import { Theme } from "@radix-ui/themes";
import type { Meta, StoryObj } from "@storybook/react";
import {
    CallsLoadingState,
    ContactsLoadingState,
} from "@/components/Skeletons/Skeletons";
import { ChatListLoadingState } from "./ChatListItemSkeleton";

const meta: Meta = {
    title: "UI/Skeletons",
    component: () => <div />, // Placeholder
    decorators: [
        (Story) => (
            <Theme
                appearance="dark"
                accentColor="teal"
                grayColor="slate"
                panelBackground="translucent"
            >
                <div
                    style={{
                        padding: "20px",
                        maxWidth: "400px",
                        background: "var(--color-background)",
                    }}
                >
                    <Story />
                </div>
            </Theme>
        ),
    ],
};

export default meta;

export const ChatList: StoryObj = {
    render: () => <ChatListLoadingState count={5} />,
};

export const CallsList: StoryObj = {
    render: () => <CallsLoadingState count={5} />,
};

export const ContactsList: StoryObj = {
    render: () => <ContactsLoadingState count={5} />,
};

export const FavoritesRoom: StoryObj = {
    render: () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <header
                style={{
                    height: "72px",
                    borderBottom: "1px solid var(--gray-5)",
                    display: "flex",
                    alignItems: "center",
                }}
            >
                <span style={{ fontWeight: "bold" }}>Избранное</span>
            </header>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                }}
            >
                <div
                    style={{
                        height: "40px",
                        width: "60%",
                        background: "var(--gray-3)",
                        borderRadius: "8px",
                    }}
                />
                <div
                    style={{
                        height: "60px",
                        width: "40%",
                        background: "var(--gray-4)",
                        borderRadius: "8px",
                        alignSelf: "flex-end",
                    }}
                />
            </div>
        </div>
    ),
};
