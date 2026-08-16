import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES, QUERY_KEYS } from "@/lib/constants";
import { AuthService } from "@/lib/services/auth";
import { ChatRealtimeService } from "@/lib/services/chat-realtime";
import { sessionCleanup, sessionGuard } from "@/lib/services/session-cleanup";
import type { UserRecord as AuthUser, RoomWithMembers } from "@/lib/types";
import type { Profile } from "@/lib/types/profile";
import { appError, err, ok } from "@/lib/utils/result";
import { useAuthStore } from ".";

// Mock AuthService (публичный seam, который использует store).
vi.mock("@/lib/services/auth", () => ({
    AuthService: {
        isValid: vi.fn(),
        getLocalRecord: vi.fn(),
        onChange: vi.fn().mockReturnValue(() => {}),
        refreshSession: vi.fn(),
        logout: vi.fn(),
    },
}));

// Mock ChatRealtimeService: signOut обязан закрывать realtime (destroy).
// Import-модуль не имеет сетевого side effect (ADR-0002).
vi.mock("@/lib/services/chat-realtime", () => ({
    ChatRealtimeService: {
        destroy: vi.fn(),
    },
}));

// Mock room-list-db: signOut обязан очищать постоянный кеш комнат, чтобы данные
// предыдущего аккаунта не оставались доступны следующему.
const roomListMocks = vi.hoisted(() => ({
    clear: vi.fn(),
}));
vi.mock("@/lib/services/room-list-db", () => ({
    roomListDb: { clear: roomListMocks.clear },
}));

/** Полный валидный record PocketBase-пользователя. */
function makeUser(id: string, username: string): AuthUser {
    return {
        id,
        username,
        display_name: `Name ${username}`,
        avatar: "",
        email: `${username}@example.com`,
        created: "2024-01-01",
        updated: "2024-01-01",
        collectionId: "users",
        collectionName: "users",
    } as unknown as AuthUser;
}

/** Отложенный promise: результат завершается вручную после signOut. */
function deferredResult<T>() {
    let resolve!: (v: T) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe("useAuthStore", () => {
    // Модульный throttle refresh (10s) живёт вне zustand-состояния и не
    // сбрасывается setState. Чтобы fetchProfile не возвращался раньше времени,
    // каждый тест стартует со строго более поздним fake Date (monotonic), чем
    // предыдущий, — deterministic завершение loading и изоляция между тестами.
    let testClockMs = 0;

    beforeEach(() => {
        vi.clearAllMocks();
        testClockMs += 60_000;
        vi.useFakeTimers({ toFake: ["Date"], now: testClockMs });
        useAuthStore.setState({
            pbUser: null,
            profile: null,
            loading: true,
            isAdmin: false,
        });
        // Изолируем seam очистки QueryClient между тестами.
        sessionCleanup.registerQueryClient(null);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("должен инициализироваться валидным пользователем из AuthService", async () => {
        const mockUser = makeUser("user-1", "test");

        vi.mocked(AuthService.isValid).mockReturnValue(true);
        vi.mocked(AuthService.getLocalRecord).mockReturnValue(mockUser);
        vi.mocked(AuthService.refreshSession).mockResolvedValue(ok(mockUser));

        await useAuthStore.getState().initialize();

        // Наблюдаемое состояние, а не внутренний вызов mapper.
        expect(useAuthStore.getState().pbUser).toEqual(mockUser);
        const profile = useAuthStore.getState().profile;
        expect(profile).not.toBeNull();
        expect(profile?.id).toBe("user-1");
        expect(profile?.username).toBe("test");
        expect(useAuthStore.getState().loading).toBe(false);
    });

    it("при сетевой ошибке инициализации сохраняет локальную сессию и завершает loading", async () => {
        const mockUser = makeUser("user-1", "test");

        vi.mocked(AuthService.isValid).mockReturnValue(true);
        vi.mocked(AuthService.getLocalRecord).mockReturnValue(mockUser);
        vi.mocked(AuthService.refreshSession).mockResolvedValue(
            err(appError(ERROR_CODES.NETWORK_ERROR, "Network Error")),
        );

        await useAuthStore.getState().initialize();

        // Контракт: сетевая ошибка не разлогинивает и не даёт ложный success,
        // но завершает loading и сохраняет локальную сессию.
        expect(useAuthStore.getState().loading).toBe(false);
        expect(useAuthStore.getState().pbUser).toEqual(mockUser);
        expect(useAuthStore.getState().profile).not.toBeNull();
        expect(AuthService.logout).not.toHaveBeenCalled();
    });

    it("при ошибке инициализации (401) очищает состояние и завершает loading", async () => {
        const mockUser = makeUser("user-1", "test");

        vi.mocked(AuthService.isValid).mockReturnValue(true);
        vi.mocked(AuthService.getLocalRecord).mockReturnValue(mockUser);
        vi.mocked(AuthService.refreshSession).mockResolvedValue(
            err(appError(ERROR_CODES.UNAUTHORIZED_ERROR, "Unauthorized")),
        );

        await useAuthStore.getState().initialize();

        // Явная недействительность сессии: состояние не остаётся частично
        // заполненным, ошибка не превращается в ложный success.
        expect(useAuthStore.getState().loading).toBe(false);
        expect(useAuthStore.getState().pbUser).toBeNull();
        expect(useAuthStore.getState().profile).toBeNull();
        expect(AuthService.logout).toHaveBeenCalled();
    });

    it("должен очищать состояние, realtime и room-list кеш при выходе (signOut)", async () => {
        useAuthStore.setState({
            pbUser: makeUser("user-1", "test"),
            profile: { id: "user-1" } as unknown as Profile,
        });

        await useAuthStore.getState().signOut();

        expect(AuthService.logout).toHaveBeenCalled();
        expect(ChatRealtimeService.destroy).toHaveBeenCalled();
        expect(roomListMocks.clear).toHaveBeenCalledWith("user-1");
        expect(useAuthStore.getState().pbUser).toBeNull();
        expect(useAuthStore.getState().profile).toBeNull();
    });

    it("при недоступности IndexedDB очистка кеша не ломает выход (best-effort)", async () => {
        useAuthStore.setState({
            pbUser: makeUser("user-1", "test"),
            profile: { id: "user-1" } as unknown as Profile,
        });
        roomListMocks.clear.mockRejectedValueOnce(
            new Error("IndexedDB unavailable"),
        );

        await useAuthStore.getState().signOut();

        expect(useAuthStore.getState().pbUser).toBeNull();
        expect(ChatRealtimeService.destroy).toHaveBeenCalled();
    });

    it("signOut инвалидирует session guard и удаляет чувствительные query-данные", async () => {
        const qc = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        sessionCleanup.registerQueryClient(qc);

        // Заполняем «общий» клиент чувствительными данными текущей сессии,
        // включая отдельные top-level ключи (favorites-room, admin, broadcast).
        qc.setQueryData(QUERY_KEYS.rooms("user-1"), [{ id: "room-a" }]);
        qc.setQueryData(QUERY_KEYS.messages("room-a"), [{ id: "msg-1" }]);
        qc.setQueryData(QUERY_KEYS.favoritesRoom("user-1"), ["favorites-1"]);
        qc.setQueryData(QUERY_KEYS.adminUsers(), [{ id: "admin-1" }]);
        qc.setQueryData(QUERY_KEYS.broadcastHistory(), [{ id: "bcast-1" }]);
        qc.setQueryData(QUERY_KEYS.media("media-1", "user-1"), [{ id: "m-1" }]);

        const generationBefore = sessionGuard.current();

        useAuthStore.setState({
            pbUser: makeUser("user-1", "test"),
            profile: { id: "user-1" } as unknown as Profile,
        });

        await useAuthStore.getState().signOut();

        // Session guard инвалидирован: номер сессии строго вырос, поэтому
        // async-ответы предыдущей сессии не запишут данные/кеш.
        expect(sessionGuard.current()).toBeGreaterThan(generationBefore);

        // Контракт: после logout старые query-данные недоступны следующему
        // пользователю (и не «всплывают» позже).
        expect(qc.getQueryData(QUERY_KEYS.rooms("user-1"))).toBeUndefined();
        expect(qc.getQueryData(QUERY_KEYS.messages("room-a"))).toBeUndefined();
        expect(
            qc.getQueryData(QUERY_KEYS.favoritesRoom("user-1")),
        ).toBeUndefined();
        expect(qc.getQueryData(QUERY_KEYS.adminUsers())).toBeUndefined();
        expect(qc.getQueryData(QUERY_KEYS.broadcastHistory())).toBeUndefined();
        expect(
            qc.getQueryData(QUERY_KEYS.media("media-1", "user-1")),
        ).toBeUndefined();

        // Постоянный кеш предыдущего пользователя очищен.
        expect(roomListMocks.clear).toHaveBeenCalledWith("user-1");
    });

    it("in-flight запрос, завершившийся после signOut, не возвращает данные в QueryClient", async () => {
        const qc = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        sessionCleanup.registerQueryClient(qc);

        // In-flight чувствительный запрос (rooms): серверный ответ ещё не пришёл.
        const deferred = deferredResult<RoomWithMembers[]>();
        const inflight = qc.fetchQuery({
            queryKey: QUERY_KEYS.rooms("user-1"),
            queryFn: () => deferred.promise,
        });
        // Убеждаемся, что запрос реально выполняется до logout.
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(qc.getQueryState(QUERY_KEYS.rooms("user-1"))?.fetchStatus).toBe(
            "fetching",
        );

        useAuthStore.setState({
            pbUser: makeUser("user-1", "test"),
            profile: { id: "user-1" } as unknown as Profile,
        });

        await useAuthStore.getState().signOut();

        // signOut отменил in-flight запрос (cancelQueries) до removeQueries.
        expect(qc.getQueryData(QUERY_KEYS.rooms("user-1"))).toBeUndefined();

        // «Старый» ответ приходит ПОСЛЕ logout: запрос отменён, данные в
        // QueryClient не возвращаются.
        deferred.resolve([{ id: "STALE_AFTER_LOGOUT" } as RoomWithMembers]);
        await expect(inflight).rejects.toBeDefined();

        expect(qc.getQueryData(QUERY_KEYS.rooms("user-1"))).toBeUndefined();
    });

    it("при смене аккаунта не оставляет данные предыдущего пользователя", async () => {
        const userA = makeUser("user-a", "alice");
        vi.mocked(AuthService.isValid).mockReturnValue(true);
        vi.mocked(AuthService.getLocalRecord).mockReturnValue(userA);
        vi.mocked(AuthService.refreshSession).mockResolvedValue(ok(userA));

        await useAuthStore.getState().initialize();
        expect(useAuthStore.getState().pbUser?.id).toBe("user-a");
        expect(AuthService.refreshSession).toHaveBeenCalledTimes(1);

        await useAuthStore.getState().signOut();
        expect(useAuthStore.getState().pbUser).toBeNull();
        expect(useAuthStore.getState().profile).toBeNull();
        // Постоянный кеш предыдущего пользователя очищен.
        expect(roomListMocks.clear).toHaveBeenCalledWith("user-a");

        const userB = makeUser("user-b", "bob");
        vi.mocked(AuthService.getLocalRecord).mockReturnValue(userB);
        vi.mocked(AuthService.refreshSession).mockResolvedValue(ok(userB));

        await useAuthStore.getState().initialize();
        expect(AuthService.refreshSession).toHaveBeenCalledTimes(2);
        expect(useAuthStore.getState().pbUser?.id).toBe("user-b");
        expect(useAuthStore.getState().profile?.id).toBe("user-b");
        expect(useAuthStore.getState().profile?.id).not.toBe("user-a");
    });
});
