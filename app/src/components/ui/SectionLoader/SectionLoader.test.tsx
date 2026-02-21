/**
 * Тесты для компонента SectionLoader.
 *
 * Проверяет:
 * - Рендерит контейнер без ошибок
 * - Содержит Radix Spinner (span-элемент)
 * - НЕ использует position: fixed (в отличие от GlobalLoader)
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionLoader } from ".";

describe("SectionLoader", () => {
    const renderComponent = () => render(<SectionLoader />);

    it("рендерится без ошибок", () => {
        const { container } = renderComponent();
        expect(container).toBeTruthy();
    });

    it("содержит Radix Spinner", () => {
        const { container } = renderComponent();
        // Radix Spinner рендерит span с классом rt-Spinner
        const spinner = container.querySelector(
            ".rt-Spinner, [class*='Spinner']",
        );
        expect(spinner).toBeInTheDocument();
    });

    it("НЕ использует position: fixed", () => {
        const { container } = renderComponent();
        const firstChild = container.firstElementChild;
        const styles = window.getComputedStyle(firstChild as Element);
        expect(styles.position).not.toBe("fixed");
    });
});
