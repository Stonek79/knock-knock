import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserMapper } from "@/lib/repositories/mappers/userMapper";
import { AuthService } from "@/lib/services/auth";
import type { UserRecord as AuthUser } from "@/lib/types";
import { appError, err, ok } from "@/lib/utils/result";
import { useAuthStore } from ".";

// Mock AuthService
vi.mock("@/lib/services/auth", () => ({
    AuthService: {
        isValid: vi.fn(),
        getLocalRecord: vi.fn(),
        onChange: vi.fn().mockReturnValue(() => {}),
        refreshSession: vi.fn(),
        logout: vi.fn(),
        mapUserToProfile: vi.fn().mockImplementation((user) => ({
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            avatar_url: null,
            role: user.role || "user",
            created_at: user.created || new Date().toISOString(),
            status: user.status || "offline",
            last_seen: user.last_seen || new Date().toISOString(),
            is_agreed_to_rules: user.is_agreed_to_rules || false,
            banned_until: user.banned_until || null,
        })),
    },
}));

describe("Хук useAuthStore (Refactored)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.setState({
            pbUser: null,
            profile: null,
            loading: true,
        });
    });

    it("должен инициализироваться данными из AuthService, если они валидны", async () => {
        const mockUser = {
            id: "user-1",
            username: "test",
            display_name: "Test User",
            avatar: "",
            email: "test@example.com",
            created: "2024-01-01",
            updated: "2024-01-01",
            collectionId: "users",
            collectionName: "users",
        } as unknown as AuthUser;

        vi.mocked(AuthService.isValid).mockReturnValue(true);
        vi.mocked(AuthService.getLocalRecord).mockReturnValue(mockUser);
        vi.mocked(AuthService.refreshSession).mockResolvedValue(ok(mockUser));

        await useAuthStore.getState().initialize();

        expect(useAuthStore.getState().pbUser).toEqual(mockUser);
        expect(UserMapper.toDomain).toHaveBeenCalledWith(
            mockUser,
            expect.any(Function),
        );
        expect(useAuthStore.getState().profile).not.toBeNull();
        expect(useAuthStore.getState().loading).toBe(false);
    });

    it("должен очищать состояние при выходе (signOut)", async () => {
        useAuthStore.setState({
            pbUser: { id: "user-1" } as unknown as AuthUser,
        });

        await useAuthStore.getState().signOut();

        expect(AuthService.logout).toHaveBeenCalled();
        expect(useAuthStore.getState().pbUser).toBeNull();
        expect(useAuthStore.getState().profile).toBeNull();
    });

    it("должен обрабатывать ошибки при инициализации", async () => {
        vi.mocked(AuthService.isValid).mockReturnValue(true);
        vi.mocked(AuthService.getLocalRecord).mockReturnValue({
            id: "user-1",
        } as unknown as AuthUser);
        vi.mocked(AuthService.refreshSession).mockResolvedValue(
            err(appError("NetworkError", "Network Error")),
        );

        await useAuthStore.getState().initialize();

        expect(useAuthStore.getState().loading).toBe(false);
        expect(useAuthStore.getState().pbUser).toBeNull();
        expect(useAuthStore.getState().profile).toBeNull();
    });
});
