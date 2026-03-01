import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AudioMessagePlayer } from "./index";

describe("AudioMessagePlayer", () => {
    it("рендерится без ошибок", () => {
        const { container } = render(
            <AudioMessagePlayer src="test.mp3" isOwn={false} />,
        );
        expect(container.firstChild).toBeInTheDocument();

        // Кнопка play / pause присутствует
        const button = container.querySelector("button");
        expect(button).toBeInTheDocument();
    });
});
