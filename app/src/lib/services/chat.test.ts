/**
 * Тесты для MessageService.
 * Проверяем отправку сообщений в mock-режиме (без реального шифрования).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase";
import { MessageService } from "./message";

// Мок Supabase
vi.mock("@/lib/supabase", () => ({
	supabase: {
		from: vi.fn(),
	},
}));

// Мок криптографии (не используется в mock-режиме)
vi.mock("@/lib/crypto", async (importOriginal) => {
	const actual = await importOriginal();
	return {
		// @ts-expect-error для расширения типов
		...actual,
		encryptMessage: vi.fn(() =>
			Promise.resolve({ ciphertext: "encrypted-text", iv: "mock-iv" }),
		),
	};
});

describe("MessageService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Включаем mock-режим, чтобы пропустить шифрование
		vi.stubEnv("VITE_USE_MOCK", "true");
	});

	describe("sendMessage", () => {
		it("вставляет сообщение с контентом без шифрования (mock-режим)", async () => {
			const mockInsert = vi.fn().mockResolvedValue({ error: null });
			// biome-ignore lint/suspicious/noExplicitAny: мок внутренних данных
			(supabase.from as any).mockReturnValue({
				insert: mockInsert,
			});

			const roomId = "room-123";
			const senderId = "user-abc";
			const content = "Hello World";
			const mockKey = {} as CryptoKey;

			await MessageService.sendMessage(roomId, senderId, content, mockKey);

			expect(supabase.from).toHaveBeenCalledWith("messages");
			expect(mockInsert).toHaveBeenCalledWith({
				room_id: roomId,
				sender_id: senderId,
				content: "Hello World",
				iv: "mock-iv",
			});
		});
	});
});
