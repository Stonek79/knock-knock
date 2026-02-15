/**
 * Тесты для компонента GlobalLoader.
 *
 * Проверяет:
 * - Изначально показывает спиннер и текст "Загрузка..."
 * - После таймаута (8 сек) показывает сообщение об ошибке
 * - Показывает кнопку "Попробовать снова" после таймаута
 */
import { Theme } from "@radix-ui/themes";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalLoader } from "./GlobalLoader";

// Мокаем useTranslation
vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (_key: string, defaultValue: string) => defaultValue,
    }),
}));

describe("GlobalLoader", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const renderComponent = () =>
        render(
            <Theme>
                <GlobalLoader />
            </Theme>,
        );

    it("изначально показывает текст загрузки", () => {
        renderComponent();
        expect(screen.getByText("Загрузка...")).toBeInTheDocument();
    });

    it("изначально НЕ показывает сообщение об ошибке", () => {
        renderComponent();
        expect(
            screen.queryByText("Не удалось подключиться"),
        ).not.toBeInTheDocument();
    });

    it("после 8 секунд показывает сообщение об ошибке", () => {
        renderComponent();

        // Перематываем таймер на 8 секунд
        act(() => {
            vi.advanceTimersByTime(8000);
        });

        expect(screen.getByText("Не удалось подключиться")).toBeInTheDocument();
    });

    it("после таймаута показывает описание и кнопку retry", () => {
        renderComponent();

        act(() => {
            vi.advanceTimersByTime(8000);
        });

        // Описание
        expect(
            screen.getByText(
                "Проверьте подключение к интернету и попробуйте снова",
            ),
        ).toBeInTheDocument();

        // Кнопка retry
        expect(screen.getByText("Попробовать снова")).toBeInTheDocument();
    });

    it("НЕ показывает ошибку до истечения таймаута", () => {
        renderComponent();

        // Прошло 7 секунд — ещё рано
        act(() => {
            vi.advanceTimersByTime(7000);
        });

        expect(
            screen.queryByText("Не удалось подключиться"),
        ).not.toBeInTheDocument();
        expect(screen.getByText("Загрузка...")).toBeInTheDocument();
    });
});
