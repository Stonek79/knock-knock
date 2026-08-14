import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { API_ROUTES, ERROR_CODES, USER_FIELDS } from "@/lib/constants";
import { pb } from "@/lib/pocketbase";
import { userRepository } from "./user.repository";

vi.mock("@/lib/pocketbase", () => ({
    pb: {
        send: vi.fn(),
        collection: vi.fn(),
        files: { getURL: vi.fn() },
        authStore: { record: null },
    },
}));

const KEY_1 = {
    id: "user-1",
    public_key_x25519: "x25519-user-1",
    public_key_signing: "signing-user-1",
};

const KEY_2 = {
    id: "user-2",
    public_key_x25519: "x25519-user-2",
    public_key_signing: "signing-user-2",
};

function setupSend(response: unknown): void {
    (pb.send as Mock).mockResolvedValue(response);
}

describe("userRepository capability key reads", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("uses the capability endpoint, deduplicates ids, and returns the exact DTO", async () => {
        setupSend([KEY_1, KEY_2]);

        const result = await userRepository.fetchSecurityKeys([
            KEY_1.id,
            KEY_1.id,
            KEY_2.id,
        ]);

        expect(result.isOk()).toBe(true);
        expect(pb.send).toHaveBeenCalledWith(API_ROUTES.USERS_KEYS, {
            method: "POST",
            body: { userIds: [KEY_1.id, KEY_2.id] },
        });
        expect(pb.collection).not.toHaveBeenCalled();
        if (result.isOk()) {
            expect(result.value).toEqual([KEY_1, KEY_2]);
        }
    });

    it("keeps room compatibility without reading users directly", async () => {
        setupSend([KEY_1]);

        const result = await userRepository.getProfilesByIds([
            KEY_1.id,
            KEY_2.id,
        ]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value).toEqual([
                { id: KEY_1.id, public_key_x25519: KEY_1.public_key_x25519 },
            ]);
        }
        expect(pb.collection).not.toHaveBeenCalled();
    });

    it("maps the own-user key contract for existing callers", async () => {
        setupSend([KEY_1]);

        const result = await userRepository.getSecurityKeys(KEY_1.id);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value).toEqual({
                [USER_FIELDS.PUBLIC_KEY_X25519]: KEY_1.public_key_x25519,
                [USER_FIELDS.PUBLIC_KEY_SIGNING]: KEY_1.public_key_signing,
            });
        }
    });

    it("fails closed for malformed key DTO responses", async () => {
        setupSend([
            {
                id: KEY_1.id,
                public_key_x25519: KEY_1.public_key_x25519,
                public_key_signing: "",
            },
        ]);

        const result = await userRepository.fetchSecurityKeys([KEY_1.id]);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.kind).toBe(ERROR_CODES.VALIDATION_ERROR);
        }
    });

    it("trims key DTO values and rejects whitespace-only keys", async () => {
        setupSend([
            {
                ...KEY_1,
                public_key_x25519: `  ${KEY_1.public_key_x25519} `,
            },
        ]);

        const result = await userRepository.fetchSecurityKeys([KEY_1.id]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value[0]).toEqual(KEY_1);
        }

        setupSend([
            {
                ...KEY_1,
                public_key_x25519: "   ",
            },
        ]);
        const invalidResult = await userRepository.fetchSecurityKeys([
            KEY_1.id,
        ]);

        expect(invalidResult.isErr()).toBe(true);
        if (invalidResult.isErr()) {
            expect(invalidResult.error.kind).toBe(ERROR_CODES.VALIDATION_ERROR);
        }
    });

    it("returns an empty result without making a request for empty ids", async () => {
        const result = await userRepository.fetchSecurityKeys([]);

        expect(result.isOk()).toBe(true);
        expect(pb.send).not.toHaveBeenCalled();
    });

    it("rejects oversized key requests instead of silently dropping members", async () => {
        const result = await userRepository.fetchSecurityKeys(
            Array.from({ length: 51 }, (_, index) => `user-${index}`),
        );

        expect(result.isErr()).toBe(true);
        expect(pb.send).not.toHaveBeenCalled();
    });

    it("preserves allowlisted private identity in the admin DTO", async () => {
        setupSend([
            {
                id: "private-user-id",
                profile_type: "private",
                username: "moderation-name",
                display_name: "Moderation Name",
                created: "2026-08-14 12:00:00",
                banned_until: null,
            },
        ]);

        const result = await userRepository.getAdminUsers("");

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value[0]).toMatchObject({
                username: "moderation-name",
                display_name: "Moderation Name",
                profile_type: "private",
            });
        }
    });

    it("rejects incomplete public contact DTOs", async () => {
        setupSend([{ id: "public-user-id", profile_type: "public" }]);

        const result = await userRepository.getContacts();

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.kind).toBe(ERROR_CODES.VALIDATION_ERROR);
        }
    });
});
