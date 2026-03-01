import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Slider } from "./index";

describe("Slider component", () => {
    it("ренденрится без ошибок", () => {
        const { container } = render(<Slider value={[0]} max={100} />);
        expect(container.firstChild).toBeInTheDocument();
    });

    it("применяет кастомный className", () => {
        const { container } = render(<Slider className="custom-class" />);
        expect(container.firstChild).toHaveClass("custom-class");
    });
});
