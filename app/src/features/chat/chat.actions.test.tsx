/**
 * Тесты действий с сообщениями в чате.
 * Проверяем: копирование, удаление, редактирование, отмену редактирования.
 */
import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClipboardService } from "@/lib/services/clipboard";
import { ChatRoom } from "./ChatRoom";

// --- Моки сервисов ---

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

// Мок роутера
vi.mock("@tanstack/react-router", () => ({
	useParams: vi.fn().mockReturnValue({ roomId: "room-1" }),
	useRouter: vi.fn().mockReturnValue({ navigate: vi.fn() }),
	useNavigate: vi.fn(),
}));

// Мок i18n — возвращает дефолтное значение
vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		// biome-ignore lint/correctness/noUnusedFunctionParameters: мок
		t: (key: string, defaultValue: string) => defaultValue,
	}),
}));

// Мок авторизации
const mockUser = { id: "user-1" };
vi.mock("@/stores/auth", () => ({
	useAuthStore: () => ({ user: mockUser }),
}));

// --- Моки хуков данных ---

const mockMessages = [
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

vi.mock("@/features/chat/hooks/useMessages", () => ({
	useMessages: () => ({
		data: mockMessages,
		isLoading: false,
	}),
}));

vi.mock("@/features/chat/hooks/useChatRoomData", () => ({
	useChatRoomData: () => ({
		data: { room: { type: "direct" }, roomKey: "key", otherUserId: "user-2" },
		isLoading: false,
	}),
}));

// Мок действий чата — перехватываем вызовы сервисов
const mockSendMessage = vi.fn().mockResolvedValue(undefined);
const mockDeleteMessage = vi.fn().mockResolvedValue(undefined);
const mockUpdateMessage = vi.fn().mockResolvedValue(undefined);

vi.mock("@/features/chat/hooks/useChatActions", () => ({
	useChatActions: () => ({
		sendMessage: mockSendMessage,
		deleteMessage: mockDeleteMessage,
		updateMessage: mockUpdateMessage,
		endSession: vi.fn(),
		ending: false,
	}),
}));

// Мок буфера обмена
vi.mock("@/lib/services/clipboard", () => ({
	ClipboardService: {
		copy: vi.fn().mockResolvedValue(true),
	},
}));

// --- Тесты ---

describe("Действия с сообщениями в чате", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSendMessage.mockClear();
		mockDeleteMessage.mockClear();
		mockUpdateMessage.mockClear();
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
			},
		});
	});

	/**
	 * Обёртка для рендера с провайдерами:
	 * - QueryClientProvider для react-query
	 * - Theme для Radix UI (включает TooltipProvider)
	 */
	const renderWithProvider = (ui: React.ReactNode) => {
		return render(
			<QueryClientProvider client={queryClient}>
				<Theme>{ui}</Theme>
			</QueryClientProvider>,
		);
	};

	it("Копирование: выделяет сообщение и копирует текст", async () => {
		renderWithProvider(<ChatRoom roomId="room-1" />);

		// Кликаем на сообщение для выделения
		const myMsg = screen.getByText("My Message");
		fireEvent.click(myMsg);

		// Нажимаем кнопку "Копировать"
		const copyBtn = screen.getByRole("button", { name: /копировать/i });
		fireEvent.click(copyBtn);

		expect(ClipboardService.copy).toHaveBeenCalledWith("My Message");
	});

	it("Удаление: выделяет сообщение и вызывает сервис удаления", async () => {
		renderWithProvider(<ChatRoom roomId="room-1" />);

		const myMsg = screen.getByText("My Message");
		fireEvent.click(myMsg);

		const deleteBtn = screen.getByRole("button", { name: /удалить/i });
		fireEvent.click(deleteBtn);

		// Подтверждаем в диалоге
		const confirmBtn = screen.getByRole("button", { name: /удалить/i });
		fireEvent.click(confirmBtn);

		await waitFor(() => {
			expect(mockDeleteMessage).toHaveBeenCalledWith("msg-1", true);
		});
	});

	it("Редактирование своего: показывает кнопку и заполняет ввод", async () => {
		renderWithProvider(<ChatRoom roomId="room-1" />);

		const myMsg = screen.getByText("My Message");
		fireEvent.click(myMsg);

		// Кнопка редактирования видна для своего сообщения
		const editBtn = screen.getByRole("button", { name: /редактировать/i });
		expect(editBtn).toBeInTheDocument();
		fireEvent.click(editBtn);

		// Поле ввода заполнено текстом сообщения
		const input = screen.getByDisplayValue("My Message");
		expect(input).toBeInTheDocument();

		// Изменяем и отправляем
		fireEvent.change(input, { target: { value: "Updated Content" } });
		const sendBtn = screen.getByRole("button", { name: /отправить/i });
		fireEvent.click(sendBtn);

		await waitFor(() => {
			expect(mockUpdateMessage).toHaveBeenCalledWith(
				"msg-1",
				"Updated Content",
			);
		});
	});

	it("Редактирование чужого: кнопка НЕ показывается", async () => {
		renderWithProvider(<ChatRoom roomId="room-1" />);

		const otherMsg = screen.getByText("Other Message");
		fireEvent.click(otherMsg);

		// Кнопка редактирования не должна быть видна
		const editBtn = screen.queryByRole("button", { name: /редактировать/i });
		expect(editBtn).not.toBeInTheDocument();
	});

	it("Отмена редактирования: Escape очищает поле ввода", async () => {
		renderWithProvider(<ChatRoom roomId="room-1" />);

		// Входим в режим редактирования
		const myMsg = screen.getByText("My Message");
		fireEvent.click(myMsg);
		const editBtn = screen.getByRole("button", { name: /редактировать/i });
		fireEvent.click(editBtn);

		// Проверяем что поле заполнено
		screen.getByDisplayValue("My Message");

		// Нажимаем Escape
		fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });

		// Поле должно очиститься
		await waitFor(() => {
			expect(screen.getByRole("textbox")).toHaveValue("");
		});
	});
});
