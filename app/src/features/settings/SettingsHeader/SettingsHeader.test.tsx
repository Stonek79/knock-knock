/**
 * Тесты для компонента SettingsHeader.
 *
 * Проверяет:
 * - Кнопка "Назад" показывается только на мобильной версии
 * - Заголовок отображается корректно
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsHeader } from "./SettingsHeader";

// Мокаем useMediaQuery
const mockUseMediaQuery = vi.fn();
vi.mock("@/hooks/useMediaQuery", () => ({
    useMediaQuery: (breakpoint: string) => mockUseMediaQuery(breakpoint),
    BREAKPOINTS: { MOBILE: "768px" },
}));

// Мокаем Link из tanstack-router
vi.mock("@tanstack/react-router", () => ({
    Link: ({
        to,
        children,
        className,
    }: {
        to: string;
        children: React.ReactNode;
        className?: string;
    }) => (
        <a href={to} className={className} data-testid="back-link">
            {children}
        </a>
    ),
}));

// Мокаем useTranslation
vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (_key: string, defaultValue: string) => defaultValue,
    }),
}));

describe("SettingsHeader", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
    });

    const renderWithProviders = (ui: ReactElement) => {
        return render(
            <QueryClientProvider client={queryClient}>
                {ui}
            </QueryClientProvider>,
        );
    };

    it("на мобильной показывает кнопку 'Назад'", () => {
        mockUseMediaQuery.mockReturnValue(true);

        renderWithProviders(<SettingsHeader title="Тестовый заголовок" />);

        // Проверяем что кнопка "Назад" есть
        const backLink = screen.getByTestId("back-link");
        expect(backLink).toBeInTheDocument();
        expect(backLink).toHaveAttribute("href", "/settings");
    });

    it("на десктопе НЕ показывает кнопку 'Назад'", () => {
        mockUseMediaQuery.mockReturnValue(false);

        renderWithProviders(<SettingsHeader title="Тестовый заголовок" />);

        // Проверяем что кнопки "Назад" нет
        expect(screen.queryByTestId("back-link")).not.toBeInTheDocument();
    });

    it("показывает заголовок", () => {
        mockUseMediaQuery.mockReturnValue(true);

        renderWithProviders(<SettingsHeader title="Тестовый заголовок" />);

        expect(screen.getByText("Тестовый заголовок")).toBeInTheDocument();
    });

    it("показывает children (иконку)", () => {
        mockUseMediaQuery.mockReturnValue(false);

        renderWithProviders(
            <SettingsHeader title="Тест">
                <span data-testid="test-icon">Icon</span>
            </SettingsHeader>,
        );

        expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    });
});
