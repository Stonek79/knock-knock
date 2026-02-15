import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from ".";

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            onAuthStateChange: vi.fn(),
            signOut: vi.fn(),
        },
        from: vi.fn(),
    },
}));

// Mock Constants/Utils if needed
vi.mock("@/lib/mock/data", () => ({
    MOCK_USERS: [
        {
            id: "mock-1",
            username: "mockuser",
            display_name: "Mock User",
            role: "user",
        },
    ],
}));

describe("useAuthStore", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.setState({
            session: null,
            user: null,
            profile: null,
            loading: true,
        });
    });

    it("should initialize with session", async () => {
        const mockSession = { user: { id: "user-1" } };
        // biome-ignore lint/suspicious/noExplicitAny: Mocking internal data
        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: mockSession },
        });

        // Mock onAuthStateChange
        // biome-ignore lint/suspicious/noExplicitAny: Mocking internal data
        (supabase.auth.onAuthStateChange as any).mockImplementation(() => {
            // cb('SIGNED_IN', mockSession);
            return { data: { subscription: { unsubscribe: vi.fn() } } };
        });

        // Mock fetchProfile implementation in store or mock DB
        // Since fetchProfile is internal, we mock the DB call
        const mockProfile = { id: "user-1", display_name: "Test User" };
        // biome-ignore lint/suspicious/noExplicitAny: Mocking internal data
        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi
                        .fn()
                        .mockResolvedValue({ data: mockProfile, error: null }),
                }),
            }),
        });

        await useAuthStore.getState().initialize();

        expect(useAuthStore.getState().user).toEqual(mockSession.user);
        expect(useAuthStore.getState().profile).toEqual(mockProfile);
        expect(useAuthStore.getState().loading).toBe(false);
    });

    it("should handle signOut", async () => {
        await useAuthStore.getState().signOut();
        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(useAuthStore.getState().session).toBeNull();
        expect(useAuthStore.getState().user).toBeNull();
    });
});
