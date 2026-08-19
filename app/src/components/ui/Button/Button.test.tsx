import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./index";

describe("Button", () => {
    it("рендерит настоящий семантический <button>", () => {
        render(<Button>Нажми</Button>);
        const button = screen.getByRole("button", { name: "Нажми" });
        expect(button.tagName).toBe("BUTTON");
    });

    it("для icon-размера включает единый механизм расширения hit-area (data-hit-area)", () => {
        render(<Button size="icon">X</Button>);
        expect(screen.getByRole("button")).toHaveAttribute(
            "data-hit-area",
            "icon",
        );
    });

    it("не задаёт data-hit-area для текстовых кнопок (xs/sm/md) и lg", () => {
        for (const size of ["xs", "md", "lg"] as const) {
            render(<Button size={size}>X</Button>);
            expect(screen.getByRole("button")).not.toHaveAttribute(
                "data-hit-area",
            );
            cleanup();
        }
    });

    it('позволяет отключить расширение через data-hit-area="none"', () => {
        render(
            <Button size="xs" data-hit-area="none">
                X
            </Button>,
        );
        expect(screen.getByRole("button")).toHaveAttribute(
            "data-hit-area",
            "none",
        );
    });

    it("вызывает onClick при клике по включённой кнопке", () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>X</Button>);
        fireEvent.click(screen.getByRole("button", { name: "X" }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("не вызывает onClick и блокирует клики в disabled-состоянии", () => {
        const onClick = vi.fn();
        render(
            <Button onClick={onClick} disabled>
                X
            </Button>,
        );
        const button = screen.getByRole("button", { name: "X" });
        expect(button).toBeDisabled();
        fireEvent.click(button);
        expect(onClick).not.toHaveBeenCalled();
    });

    it("пробрасывает data-hit-area в дочерний элемент через asChild", () => {
        render(
            <Button asChild size="icon">
                <a href="/">X</a>
            </Button>,
        );
        const link = screen.getByRole("link", { name: "X" });
        expect(link).toHaveAttribute("data-hit-area", "icon");
    });
});
