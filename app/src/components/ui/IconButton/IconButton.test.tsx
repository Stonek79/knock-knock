import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "./index";

describe("IconButton", () => {
    it('рендерит настоящий семантический <button> с type="button"', () => {
        render(<IconButton>X</IconButton>);
        const button = screen.getByRole("button", { name: "X" });
        expect(button.tagName).toBe("BUTTON");
        expect(button).toHaveAttribute("type", "button");
    });

    it.each([
        "xs",
        "sm",
        "md",
    ] as const)("для размера %s включает единый механизм расширения hit-area (data-hit-area)", (size) => {
        render(<IconButton size={size}>X</IconButton>);
        expect(screen.getByRole("button")).toHaveAttribute(
            "data-hit-area",
            size,
        );
    });

    it.each([
        "lg",
        "xl",
    ] as const)("для размера %s не задаёт data-hit-area (размер уже >= touch)", (size) => {
        render(<IconButton size={size}>X</IconButton>);
        expect(screen.getByRole("button")).not.toHaveAttribute("data-hit-area");
    });

    it('позволяет отключить расширение через data-hit-area="none"', () => {
        render(
            <IconButton size="xs" data-hit-area="none">
                X
            </IconButton>,
        );
        expect(screen.getByRole("button")).toHaveAttribute(
            "data-hit-area",
            "none",
        );
    });

    it("сохраняет клавиатурную навигацию (кнопка остаётся фокусируемой)", () => {
        render(<IconButton aria-label="Кнопка">X</IconButton>);
        const button = screen.getByRole("button", { name: "Кнопка" });
        expect(button).not.toHaveAttribute("tabindex", "-1");
        button.focus();
        expect(button).toHaveFocus();
    });

    it("вызывает onClick при клике по включённой кнопке", () => {
        const onClick = vi.fn();
        render(<IconButton onClick={onClick}>X</IconButton>);
        fireEvent.click(screen.getByRole("button", { name: "X" }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("не вызывает onClick и блокирует клики в disabled-состоянии", () => {
        const onClick = vi.fn();
        render(
            <IconButton onClick={onClick} disabled>
                X
            </IconButton>,
        );
        const button = screen.getByRole("button", { name: "X" });
        expect(button).toBeDisabled();
        fireEvent.click(button);
        expect(onClick).not.toHaveBeenCalled();
    });

    it("пробрасывает data-hit-area в дочерний элемент через asChild", () => {
        render(
            <IconButton asChild size="xs">
                <a href="/">X</a>
            </IconButton>,
        );
        const link = screen.getByRole("link", { name: "X" });
        expect(link).toHaveAttribute("data-hit-area", "xs");
    });
});
