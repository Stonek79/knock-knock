import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { MessageInput } from "@/features/chat/message";
import { MessageService } from "@/lib/services/message";

// Mocks
vi.mock("@/lib/services/message", async () => {
    const { ok } = await import("@/lib/utils/result");
    return {
        MessageService: {
            sendMessage: vi.fn().mockResolvedValue(ok("msg-1")),
            deleteMessage: vi.fn().mockResolvedValue(ok(undefined)),
            updateMessage: vi.fn().mockResolvedValue(ok(undefined)),
            markMessagesAsRead: vi.fn().mockResolvedValue(ok(undefined)),
            markMessageAsDelivered: vi.fn().mockResolvedValue(ok(undefined)),
        },
    };
});

vi.mock("@/lib/services/room", async () => {
    const { ok } = await import("@/lib/utils/result");
    return {
        RoomService: {
            createRoom: vi
                .fn()
                .mockResolvedValue(ok({ roomId: "room-1", roomKey: {} })),
            findOrCreateDM: vi.fn().mockResolvedValue(ok("room-1")),
        },
    };
});

vi.mock("@/features/chat/message", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        useMessages: () => ({
            data: [],
            isLoading: false,
        }),
    };
});

vi.mock("react-i18next", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        useTranslation: () => ({
            t: (_key: string, defaultValue: string) => defaultValue,
        }),
    };
});

describe("Интеграция чата", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("отправка сообщения вызывает MessageService.sendMessage", async () => {
        const handleSend = async (text: string) => {
            await MessageService.sendMessage(
                "room-1",
                "user-1",
                text,
                {} as CryptoKey,
            );
        };

        render(
            <ToastProvider>
                <MessageInput onSend={handleSend} />
            </ToastProvider>,
        );

        const input = screen.getByPlaceholderText("Сообщение");
        fireEvent.change(input, { target: { value: "Hello World" } });

        // Find buttons. There should be Emoji, Attachment, and Send.
        const sendButton = screen.getByRole("button", { name: /отправить/i });

        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(MessageService.sendMessage).toHaveBeenCalledWith(
                "room-1",
                "user-1",
                "Hello World",
                expect.any(Object),
            );
        });
    });

    it("редактирование сообщения заполняет поле ввода и вызывает onSend с логикой обновления", async () => {
        const handleSend = vi.fn();

        // Simulating "Edit Mode" where initialValue is passed
        render(
            <ToastProvider>
                <MessageInput onSend={handleSend} initialValue="Old Content" />
            </ToastProvider>,
        );

        const input = screen.getByDisplayValue("Old Content");
        expect(input).toBeDefined();

        fireEvent.change(input, { target: { value: "New Content" } });

        const sendButton = screen.getByRole("button", { name: /отправить/i });

        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(handleSend).toHaveBeenCalledWith("New Content");
        });
    });

    // Note: Full integration testing with Realtime updates is hard to mock perfectly in JSDOM
    // without spinning up a real Supabase instance or heavy mocking of the subscription hook.
    // For now, we test the service calls which was the reported breakage point (actions not firing).
});
