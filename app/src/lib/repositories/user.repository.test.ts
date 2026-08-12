import { ClientResponseError } from "pocketbase";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { DB_TABLES, ERROR_CODES, USER_FIELDS } from "@/lib/constants";
import { pb } from "@/lib/pocketbase";
import { userRepository } from "./user.repository";

vi.mock("@/lib/pocketbase", () => ({
    pb: {
        collection: vi.fn(),
        files: { getURL: vi.fn() },
    },
}));

/**
 * Узкий repository-level тест для getProfilesByIds.
 *
 * Отражает реальный runtime/API-контракт PocketBase: ошибка HTTP >= 400
 * бросается как ClientResponseError (числовой `status`), а 404 означает
 * «запись не найдена». Тестовые адаптеры (и server-side hooks) могут бросать
 * структурно эквивалентный объект `{ status: 404 }` — оба варианта должны
 * обрабатываться одинаково. Malformed-значения (null, строка, {} или Error)
 * НЕ являются 404 и не должны маскироваться.
 *
 * Здесь только плейсхолдеры base64 и статичные id — без секретов/plaintext.
 */

type MockUser = { id: string; public_key_x25519: string };
type GetOneCase =
    | { kind: "ok"; user: MockUser }
    | { kind: "throw"; error: unknown };

const getOneCalls: Array<{ id: string; fields?: unknown }> = [];

function setupMockPb(cases: Record<string, GetOneCase>): void {
    getOneCalls.length = 0;

    (pb.collection as Mock).mockImplementation(() => ({
        getOne: vi.fn(async (id: string, options?: { fields?: string }) => {
            getOneCalls.push({ id, fields: options?.fields });
            const entry = cases[id];
            if (!entry) {
                // По умолчанию — faithful 404 от PocketBase (ClientResponseError).
                throw new ClientResponseError({
                    status: 404,
                    url: "http://mock/users",
                    data: {},
                });
            }
            if (entry.kind === "throw") {
                throw entry.error;
            }
            return entry.user;
        }),
    }));

    (pb.files.getURL as Mock).mockImplementation(
        (rec: { id: string }, file: string) => `http://mock/${rec.id}/${file}`,
    );
}

// base64-плейсхолдеры 32 байт — не секреты, не реальные ключи.
const USER_1: MockUser = {
    id: "user-1",
    public_key_x25519: btoa("mock1111mock1111mock1111mock1111"),
};
const USER_2: MockUser = {
    id: "user-2",
    public_key_x25519: btoa("mock2222mock2222mock2222mock2222"),
};

describe("userRepository.getProfilesByIds", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("возвращает Ok со всеми найденными профилями", async () => {
        setupMockPb({
            [USER_1.id]: { kind: "ok", user: USER_1 },
            [USER_2.id]: { kind: "ok", user: USER_2 },
        });

        const result = await userRepository.getProfilesByIds([
            USER_1.id,
            USER_2.id,
        ]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value).toEqual([USER_1, USER_2]);
        }
        expect(pb.collection).toHaveBeenCalledWith(DB_TABLES.USERS);
        expect(getOneCalls[0].fields).toContain(USER_FIELDS.ID);
        expect(getOneCalls[0].fields).toContain(USER_FIELDS.PUBLIC_KEY_X25519);
    });

    it("faithful PocketBase 404 (ClientResponseError) пропускается", async () => {
        setupMockPb({
            [USER_1.id]: { kind: "ok", user: USER_1 },
            [USER_2.id]: {
                kind: "throw",
                error: new ClientResponseError({
                    status: 404,
                    url: "http://mock/users",
                    data: {},
                }),
            },
        });

        const result = await userRepository.getProfilesByIds([
            USER_1.id,
            USER_2.id,
        ]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value).toEqual([USER_1]);
        }
    });

    it("структурный { status: 404 } (как в test-адаптерах) тоже пропускается", async () => {
        setupMockPb({
            [USER_1.id]: { kind: "ok", user: USER_1 },
            [USER_2.id]: { kind: "throw", error: { status: 404 } },
        });

        const result = await userRepository.getProfilesByIds([
            USER_1.id,
            USER_2.id,
        ]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value).toEqual([USER_1]);
        }
    });

    it("ошибки 401/403/500 возвращает как NETWORK_ERROR", async () => {
        for (const status of [401, 403, 500]) {
            setupMockPb({
                [USER_1.id]: {
                    kind: "throw",
                    error: new ClientResponseError({
                        status,
                        url: "http://mock/users",
                        data: {},
                    }),
                },
            });

            const result = await userRepository.getProfilesByIds([USER_1.id]);

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.NETWORK_ERROR);
            }
        }
    });

    it("структурная { status: 500 } возвращается как NETWORK_ERROR", async () => {
        setupMockPb({
            [USER_1.id]: { kind: "throw", error: { status: 500 } },
        });

        const result = await userRepository.getProfilesByIds([USER_1.id]);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.kind).toBe(ERROR_CODES.NETWORK_ERROR);
        }
    });

    it("malformed rejection (null, строка, {}, Error, статус-строка) не считается 404", async () => {
        const malformed: unknown[] = [
            null,
            "boom",
            {},
            new Error("boom"),
            { status: "404" },
        ];

        for (const error of malformed) {
            setupMockPb({
                [USER_1.id]: { kind: "throw", error },
            });

            const result = await userRepository.getProfilesByIds([USER_1.id]);

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.NETWORK_ERROR);
            }
        }
    });

    it("пустой список id возвращает Ok([])", async () => {
        setupMockPb({});

        const result = await userRepository.getProfilesByIds([]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value).toEqual([]);
        }
    });
});
