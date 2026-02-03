import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageInput } from '@/features/chat/MessageInput';
import { MessageService } from '@/lib/services/message';

// Mocks
vi.mock('@/lib/services/message', () => ({
    MessageService: {
        sendMessage: vi.fn(),
        deleteMessage: vi.fn(),
        updateMessage: vi.fn(),
        markMessagesAsRead: vi.fn(),
        markMessageAsDelivered: vi.fn(),
    },
}));

vi.mock('@/lib/services/room', () => ({
    RoomService: {
        createRoom: vi.fn(),
        findOrCreateDM: vi.fn(),
    },
}));

vi.mock('@/features/chat/hooks/useMessages', () => ({
    useMessages: () => ({
        data: [],
        isLoading: false,
    }),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, defaultValue: string) => defaultValue,
    }),
}));

describe('Chat Integration Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sending a message calls MessageService.sendMessage', async () => {
        const handleSend = async (text: string) => {
            await MessageService.sendMessage(
                'room-1',
                'user-1',
                text,
                {} as CryptoKey,
            );
        };

        render(<MessageInput onSend={handleSend} />);

        const input = screen.getByPlaceholderText('Сообщение');
        fireEvent.change(input, { target: { value: 'Hello World' } });

        // Find buttons. There should be Emoji, Attachment, and Send.
        const sendButton = screen.getByRole('button', { name: /отправить/i });

        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(MessageService.sendMessage).toHaveBeenCalledWith(
                'room-1',
                'user-1',
                'Hello World',
                expect.any(Object),
            );
        });
    });

    it('editing a message populates input and calls onSend with update logic', async () => {
        const handleSend = vi.fn();

        // Simulating "Edit Mode" where initialValue is passed
        render(<MessageInput onSend={handleSend} initialValue="Old Content" />);

        const input = screen.getByDisplayValue('Old Content');
        expect(input).toBeDefined();

        fireEvent.change(input, { target: { value: 'New Content' } });

        const sendButton = screen.getByRole('button', { name: /отправить/i });

        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(handleSend).toHaveBeenCalledWith('New Content');
        });
    });

    // Note: Full integration testing with Realtime updates is hard to mock perfectly in JSDOM
    // without spinning up a real Supabase instance or heavy mocking of the subscription hook.
    // For now, we test the service calls which was the reported breakage point (actions not firing).
});
