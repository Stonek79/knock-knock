import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PROFILE_TYPE, ROOM_TYPE, ROOM_VISIBILITY } from "@/lib/constants";
import type { PeerUser, RoomWithMembers } from "@/lib/types/room";
import { useRoomHeaderInfo } from "./useRoomHeaderInfo";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, fallback: string) =>
            key === "chat.privateUserName" ? "Аноним" : fallback,
    }),
}));

vi.mock("@/stores/auth", () => ({
    useAuthStore: (selector: (state: { profile: { id: string } }) => unknown) =>
        selector({ profile: { id: "current-user" } }),
}));

const room: RoomWithMembers = {
    id: "room-id",
    name: null,
    type: ROOM_TYPE.DIRECT,
    visibility: ROOM_VISIBILITY.PRIVATE,
    avatar_url: null,
    created_by: "current-user",
    created_at: "2026-08-11T00:00:00.000Z",
    room_members: [],
    metadata: {},
    permissions: {},
    last_message: null,
};

const privatePeer: PeerUser = {
    id: "private-user",
    display_name: "Секретное настоящее имя",
    username: "secret_username",
    avatar_url: "https://example.test/private-avatar.jpg",
    profile_type: PROFILE_TYPE.PRIVATE,
};

describe("useRoomHeaderInfo privacy", () => {
    it("скрывает имя и аватар закрытого профиля", () => {
        const { result } = renderHook(() =>
            useRoomHeaderInfo({ room, peerUser: privatePeer }),
        );

        expect(result.current.displayName).toBe("Аноним");
        expect(result.current.avatarUrl).toBeUndefined();
        expect(result.current.resolvedPeer?.username).toBeUndefined();
        expect(result.current.resolvedPeer?.display_name).toBe("Аноним");
    });

    it("показывает данные только явно открытого профиля", () => {
        const publicPeer: PeerUser = {
            ...privatePeer,
            profile_type: PROFILE_TYPE.PUBLIC,
        };
        const { result } = renderHook(() =>
            useRoomHeaderInfo({ room, peerUser: publicPeer }),
        );

        expect(result.current.displayName).toBe(privatePeer.display_name);
        expect(result.current.avatarUrl).toBe(privatePeer.avatar_url);
    });

    it("считает неизвестный тип профиля закрытым", () => {
        const peerWithoutType: PeerUser = {
            id: privatePeer.id,
            display_name: privatePeer.display_name,
            avatar_url: privatePeer.avatar_url,
        };
        const { result } = renderHook(() =>
            useRoomHeaderInfo({ room, peerUser: peerWithoutType }),
        );

        expect(result.current.displayName).toBe("Аноним");
        expect(result.current.avatarUrl).toBeUndefined();
    });
});
