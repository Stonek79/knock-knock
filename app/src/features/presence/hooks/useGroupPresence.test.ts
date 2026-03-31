import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { USER_WEB_STATUS } from "@/lib/constants";

// Мокаем зависимости до импорта хука
vi.mock("./usePresence", () => ({
    usePresence: vi.fn(),
}));

// Импортируем хук и мок
import { useGroupPresence } from "./useGroupPresence";
import { usePresence } from "./usePresence";

describe("useGroupPresence", () => {
    it("должен корректно подсчитывать количество пользователей онлайн", () => {
        // Настраиваем мок usePresence
        vi.mocked(usePresence).mockReturnValue({
            "user-1": USER_WEB_STATUS.ONLINE,
            "user-2": USER_WEB_STATUS.OFFLINE,
            "user-3": USER_WEB_STATUS.ONLINE,
            "user-4": USER_WEB_STATUS.ONLINE,
        });

        // Тестируемые ID (user-4 онлайн, но его нет в списке группы)
        const groupIds = ["user-1", "user-2", "user-3"];

        const { result } = renderHook(() => useGroupPresence(groupIds));

        expect(result.current.totalCount).toBe(3);
        expect(result.current.onlineCount).toBe(2); // user-1, user-3
        expect(result.current.onlineStatusMap).toEqual({
            "user-1": true,
            "user-2": false,
            "user-3": true,
        });
    });

    it("должен возвращать 0 онлайн, если список пуст", () => {
        vi.mocked(usePresence).mockReturnValue({
            "user-1": USER_WEB_STATUS.ONLINE,
        });

        const { result } = renderHook(() => useGroupPresence([]));

        expect(result.current.totalCount).toBe(0);
        expect(result.current.onlineCount).toBe(0);
        expect(result.current.onlineStatusMap).toEqual({});
    });
});
