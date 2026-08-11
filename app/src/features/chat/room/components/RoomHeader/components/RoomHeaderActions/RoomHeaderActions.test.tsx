import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RoomHeaderActions } from ".";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (_key: string, fallback?: string) => fallback ?? "Завершить сессию",
    }),
}));

describe("RoomHeaderActions", () => {
    it("не предлагает звонки в одноразовой комнате", () => {
        render(
            <RoomHeaderActions
                isEphemeral
                onEndSession={vi.fn()}
                onAudioCallClick={vi.fn()}
                onVideoCallClick={vi.fn()}
            />,
        );

        expect(screen.queryByLabelText("Позвонить")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Видеозвонок")).not.toBeInTheDocument();
        expect(screen.getByRole("button")).toBeInTheDocument();
    });
});
