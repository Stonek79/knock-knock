import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/lib/constants";
import type { RoomInvitePreviewDto } from "@/lib/types";
import { appError, err, ok } from "@/lib/utils/result";
import { inviteRepository } from "../repositories/invite.repository";
import { inviteService } from "./invite.service";

// Моким только репозиторий: никаких обращений к PocketBase/API из теста.
vi.mock("../repositories/invite.repository", () => ({
    inviteRepository: {
        getInviteByToken: vi.fn(),
        joinRoom: vi.fn(),
    },
}));

function makeDto(overrides: Partial<RoomInvitePreviewDto> = {}) {
    const dto: RoomInvitePreviewDto = {
        id: "invite-1",
        room: "room-1",
        expand: {
            room: {
                id: "room-1",
                name: "Commander Chat",
                type: "group",
                visibility: "private",
            },
        },
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        max_uses: 1,
        uses_count: 0,
        ...overrides,
    };
    return dto;
}

describe("inviteService.validateInvite", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns the narrow RoomInvitePreviewDto for a valid invite", async () => {
        const dto = makeDto();
        vi.mocked(inviteRepository.getInviteByToken).mockResolvedValue(ok(dto));

        const res = await inviteService.validateInvite("kk-token");

        expect(res.isErr()).toBe(false);
        if (!res.isErr()) {
            // DTO не должен содержать внутренние поля полной записи Invites.
            expect(res.value).toEqual(dto);
            expect("token" in res.value).toBe(false);
            expect("created_by" in res.value).toBe(false);
        }
        expect(inviteRepository.getInviteByToken).toHaveBeenCalledWith(
            "kk-token",
        );
    });

    it("passes through a repository error without expecting a full Invites record", async () => {
        const error = appError(ERROR_CODES.NOT_FOUND_ERROR, "Инвайт не найден");
        vi.mocked(inviteRepository.getInviteByToken).mockResolvedValue(
            err(error),
        );

        const res = await inviteService.validateInvite("kk-token");

        expect(res.isErr()).toBe(true);
        if (res.isErr()) {
            expect(res.error).toBe(error);
        }
    });

    it("rejects an exhausted invite from the DTO fields", async () => {
        vi.mocked(inviteRepository.getInviteByToken).mockResolvedValue(
            ok(makeDto({ max_uses: 1, uses_count: 1 })),
        );

        const res = await inviteService.validateInvite("kk-token");

        expect(res.isErr()).toBe(true);
    });

    it("rejects an expired invite from the DTO fields", async () => {
        vi.mocked(inviteRepository.getInviteByToken).mockResolvedValue(
            ok(makeDto({ expires_at: new Date(Date.now() - 1).toISOString() })),
        );

        const res = await inviteService.validateInvite("kk-token");

        expect(res.isErr()).toBe(true);
    });
});
