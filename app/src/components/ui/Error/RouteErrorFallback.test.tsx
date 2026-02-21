/**
 * Тесты для компонента RouteErrorFallback.
 *
 * Проверяет:
 * - Показывает заголовок "Что-то пошло не так"
 * - Показывает сообщение ошибки
 * - Содержит кнопку "Попробовать снова"
 * - Кнопка вызывает reset и router.invalidate
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteErrorFallback } from "./RouteErrorFallback";

// Мокаем useTranslation
vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (_key: string, defaultValue: string) => defaultValue,
    }),
}));

// Мокаем TanStack Router
const mockInvalidate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
    useRouter: () => ({
        invalidate: mockInvalidate,
    }),
}));

describe("RouteErrorFallback", () => {
    const mockReset = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderComponent = (error: Error = new Error("Тестовая ошибка")) =>
        render(
            <RouteErrorFallback
                error={error}
                reset={mockReset}
                info={undefined}
            />,
        );

    it("показывает заголовок ошибки", () => {
        renderComponent();
        expect(screen.getByText("Что-то пошло не так")).toBeInTheDocument();
    });

    it("показывает текст ошибки из Error-объекта", () => {
        renderComponent(new Error("Сервер недоступен"));
        expect(screen.getByText("Сервер недоступен")).toBeInTheDocument();
    });

    it("показывает кнопку retry", () => {
        renderComponent();
        expect(screen.getByText("Попробовать снова")).toBeInTheDocument();
    });

    it("при клике на retry вызывает reset и invalidate", () => {
        renderComponent();

        const retryButton = screen.getByText("Попробовать снова");
        fireEvent.click(retryButton);

        expect(mockReset).toHaveBeenCalledOnce();
        expect(mockInvalidate).toHaveBeenCalledOnce();
    });

    it("содержит иконку ошибки", () => {
        const { container } = renderComponent();
        // AlertTriangle из lucide-react рендерит svg
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
    });
});
