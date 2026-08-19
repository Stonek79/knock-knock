import { beforeEach, describe, expect, it, vi } from "vitest";

const pbMocks = vi.hoisted(() => ({
    getToken: vi.fn(),
}));

vi.mock("@/lib/pocketbase", () => ({
    pb: {
        authStore: { token: "auth-token" },
        buildURL: (path: string) => `https://pb.example${path}`,
        files: { getToken: pbMocks.getToken },
    },
}));

const { mediaRepository } = await import("./media.repository");

describe("mediaRepository.downloadFile", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        pbMocks.getToken.mockResolvedValue("file-token");
    });

    it("adds a PocketBase file token while preserving the auth header", async () => {
        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(new Response("encrypted", { status: 200 }));

        const result = await mediaRepository.downloadFile(
            "https://pb.example/api/files/media/record/file.bin?download=1",
        );

        expect(result.isOk()).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://pb.example/api/files/media/record/file.bin?download=1&token=file-token",
            { headers: { Authorization: "auth-token" } },
        );
        fetchMock.mockRestore();
    });

    it("returns an error when PocketBase cannot issue a file token", async () => {
        pbMocks.getToken.mockRejectedValue(new Error("token request failed"));

        const result = await mediaRepository.downloadFile(
            "https://pb.example/api/files/media/record/file.bin",
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.message).toBe("token request failed");
        }
    });
});

describe("mediaRepository.downloadSystemFile", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("uses the authenticated broadcast route without exposing a file token", async () => {
        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(new Response("broadcast", { status: 200 }));

        const result = await mediaRepository.downloadSystemFile(
            "media1",
            "announcement.jpg",
        );

        expect(result.isOk()).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://pb.example/api/custom/broadcast/media/media1/announcement.jpg",
            { headers: { Authorization: "auth-token" } },
        );
        fetchMock.mockRestore();
    });
});
