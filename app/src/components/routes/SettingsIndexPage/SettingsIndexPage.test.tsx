import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsIndexPage } from "./index";

/**
 * Тесты для компонента SettingsIndexPage.
 *
 * Проверяет:
 * - Редирект на /settings/account на десктопе
 * - Показ SettingsMenu на мобильной версии
 */

// Мокаем useMediaQuery
const mockUseMediaQuery = vi.fn();
vi.mock("@/hooks/useMediaQuery", () => ({
    useMediaQuery: (breakpoint: string) => mockUseMediaQuery(breakpoint),
    BREAKPOINTS: { MOBILE: "768px" },
}));

// Мокаем Navigate из tanstack-router
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
    Navigate: ({ to }: { to: string }) => {
        mockNavigate(to);
        return <div data-testid="navigate" data-to={to} />;
    },
}));

// Мокаем SettingsMenu
vi.mock("@/features/settings/SettingsMenu", () => ({
    SettingsMenu: () => <div data-testid="settings-menu">Settings Menu</div>,
}));

describe("SettingsIndexPage", () => {
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
                <Theme>{ui}</Theme>
            </QueryClientProvider>,
        );
    };

    it("на десктопе редиректит на /settings/account", () => {
        // Десктоп - isMobile = false
        mockUseMediaQuery.mockReturnValue(false);

        renderWithProviders(<SettingsIndexPage />);

        // Проверяем что Navigate был вызван с правильным путём
        expect(mockNavigate).toHaveBeenCalledWith("/settings/account");
    });

    it("на мобильной показывает SettingsMenu", () => {
        // Мобильная - isMobile = true
        mockUseMediaQuery.mockReturnValue(true);

        renderWithProviders(<SettingsIndexPage />);

        // Проверяем что SettingsMenu отображается
        expect(screen.getByTestId("settings-menu")).toBeInTheDocument();
        // Navigate не должен вызываться
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
