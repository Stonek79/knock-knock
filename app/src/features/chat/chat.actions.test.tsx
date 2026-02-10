/**
 * Тесты действий с сообщениями в чате.
 * Проверяем: копирование, удаление, редактирование, отмену редактирования.
 */

import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    act,
    cleanup,
    fireEvent,
    type RenderResult,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClipboardService } from "@/lib/services/clipboard";
import { ok } from "@/lib/utils/result";
import { ChatRoom } from "./ChatRoom";

// --- Стабильные константы и моки ---

const MOCK_USER = { id: "user-1" };
const MOCK_MESSAGES = [
    {
        id: "msg-1",
        content: "My Message",
        sender_id: "user-1",
        created_at: "2023-01-01",
    },
    {
        id: "msg-2",
        content: "Other Message",
        sender_id: "user-2",
        created_at: "2023-01-01",
    },
];

const MOCK_SEND_MESSAGE = vi.fn().mockResolvedValue(ok(undefined));
const MOCK_DELETE_MESSAGE = vi.fn().mockResolvedValue(ok(undefined));
const MOCK_UPDATE_MESSAGE = vi.fn().mockResolvedValue(ok(undefined));
const MOCK_MARK_AS_READ = vi.fn();
const MOCK_T = (_: string, defaultValue: string) => defaultValue;

// --- Мокирование зависимостей (Должно быть в начале файла) ---

vi.mock("@/lib/services/message", () => ({
    MessageService: {
        sendMessage: vi.fn(),
        deleteMessage: vi.fn(),
        updateMessage: vi.fn(),
    },
}));

vi.mock("@/lib/services/room", () => ({
    RoomService: {
        findOrCreateDM: vi.fn(),
    },
}));

vi.mock("@tanstack/react-router", () => ({
    useParams: vi.fn().mockReturnValue({ roomId: "room-1" }),
    useRouter: vi.fn().mockReturnValue({ navigate: vi.fn() }),
    useNavigate: vi.fn(),
}));

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: MOCK_T,
    }),
}));

vi.mock("@/stores/auth", () => ({
    useAuthStore: () => ({ user: MOCK_USER }),
}));

vi.mock("@/features/chat/hooks/useMessages", () => ({
    useMessages: () => ({
        data: MOCK_MESSAGES,
        isLoading: false,
    }),
}));

vi.mock("@/features/chat/hooks/useChatRoomData", () => ({
    useChatRoomData: () => ({
        data: {
            room: { type: "direct" },
            roomKey: "key",
            otherUserId: "user-2",
        },
        isLoading: false,
    }),
}));

vi.mock("@/features/chat/hooks/useChatPeer", () => ({
    useChatPeer: () => ({
        data: { display_name: "Peer User", id: "user-2" },
        isLoading: false,
    }),
}));

vi.mock("@/features/chat/hooks/useChatScroll", () => ({
    useChatScroll: () => ({
        viewportRef: { current: null },
        showScrollButton: false,
        scrollToBottom: vi.fn(),
        handleScroll: vi.fn(),
    }),
}));

vi.mock("@/features/chat/hooks/useUnreadTracking", () => ({
    useUnreadTracking: () => ({
        firstUnreadId: null,
        markAsRead: MOCK_MARK_AS_READ,
    }),
}));

vi.mock("@/features/chat/hooks/useChatActions", () => ({
    useChatActions: () => ({
        sendMessage: MOCK_SEND_MESSAGE,
        deleteMessage: MOCK_DELETE_MESSAGE,
        updateMessage: MOCK_UPDATE_MESSAGE,
        endSession: vi.fn(),
        ending: false,
    }),
}));

vi.mock("@/lib/services/clipboard", () => ({
    ClipboardService: {
        copy: vi.fn().mockResolvedValue(true),
    },
}));

// --- Тестовая среда ---

describe("Действия с сообщениями в чате", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        MOCK_SEND_MESSAGE.mockClear();
        MOCK_DELETE_MESSAGE.mockClear();
        MOCK_UPDATE_MESSAGE.mockClear();
        MOCK_MARK_AS_READ.mockClear();

        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false, gcTime: 0 },
            },
        });
    });

    afterEach(() => {
        // Очистка DOM и сброс состояния
        cleanup();
    });

    /**
     * Вспомогательная функция для рендера
     */
    const renderWithProvider = async (ui: ReactElement) => {
        let result!: RenderResult;
        await act(async () => {
            result = render(
                <QueryClientProvider client={queryClient}>
                    <Theme>{ui}</Theme>
                </QueryClientProvider>,
            );
        });

        // Гарантируем, что компонент отрисовался без состояния загрузки
        await waitFor(() => {
            expect(screen.queryByText(/загрузка/i)).not.toBeInTheDocument();
        });

        return result;
    };

    it("Копирование: выделяет сообщение и копирует текст", async () => {
        await renderWithProvider(<ChatRoom roomId="room-1" />);

        const myMsg = screen.getByText("My Message");

        // Клик может вызывать обновление состояния выделения
        await act(async () => {
            fireEvent.click(myMsg);
        });

        const copyBtn = screen.getByRole("button", { name: /копировать/i });
        await act(async () => {
            fireEvent.click(copyBtn);
        });

        expect(ClipboardService.copy).toHaveBeenCalledWith("My Message");
    });

    it("Удаление: выделяет сообщение и вызывает сервис удаления", async () => {
        await renderWithProvider(<ChatRoom roomId="room-1" />);

        const myMsg = screen.getByText("My Message");
        await act(async () => {
            fireEvent.click(myMsg);
        });

        const deleteBtn = screen.getByRole("button", { name: /удалить/i });
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        const confirmBtn = screen.getByRole("button", { name: /удалить/i });
        await act(async () => {
            fireEvent.click(confirmBtn);
        });

        await waitFor(() => {
            expect(MOCK_DELETE_MESSAGE).toHaveBeenCalledWith("msg-1", true);
        });
    });

    it("Редактирование своего: показывает кнопку и заполняет ввод", async () => {
        await renderWithProvider(<ChatRoom roomId="room-1" />);

        const myMsg = screen.getByText("My Message");
        await act(async () => {
            fireEvent.click(myMsg);
        });

        const editBtn = screen.getByRole("button", { name: /редактировать/i });
        expect(editBtn).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(editBtn);
        });

        const input = screen.getByDisplayValue("My Message");
        expect(input).toBeInTheDocument();

        await act(async () => {
            fireEvent.change(input, { target: { value: "Updated Content" } });
        });

        const sendBtn = screen.getByRole("button", { name: /отправить/i });
        await act(async () => {
            fireEvent.click(sendBtn);
        });

        await waitFor(() => {
            expect(MOCK_UPDATE_MESSAGE).toHaveBeenCalledWith(
                "msg-1",
                "Updated Content",
            );
        });
    });

    it("Редактирование чужого: кнопка НЕ показывается", async () => {
        await renderWithProvider(<ChatRoom roomId="room-1" />);

        const otherMsg = screen.getByText("Other Message");
        await act(async () => {
            fireEvent.click(otherMsg);
        });

        const editBtn = screen.queryByRole("button", {
            name: /редактировать/i,
        });
        expect(editBtn).not.toBeInTheDocument();
    });

    it("Отмена редактирования: Escape очищает поле ввода", async () => {
        await renderWithProvider(<ChatRoom roomId="room-1" />);

        const myMsg = screen.getByText("My Message");
        await act(async () => {
            fireEvent.click(myMsg);
        });

        const editBtn = screen.getByRole("button", { name: /редактировать/i });
        await act(async () => {
            fireEvent.click(editBtn);
        });

        screen.getByDisplayValue("My Message");

        await act(async () => {
            fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
        });

        await waitFor(() => {
            expect(screen.getByRole("textbox")).toHaveValue("");
        });
    });
});
