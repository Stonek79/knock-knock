import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { DB_TABLES } from "@/lib/constants";
import { base64ToArrayBuffer, getKeyPair } from "@/lib/crypto";
import { unwrapRoomKey } from "@/lib/crypto/encryption";
import { supabase } from "@/lib/supabase";
import type { RoomWithMembers } from "@/lib/types/room";
import { useAuthStore } from "@/stores/auth";

/**
 * Хук для загрузки данных комнаты и ключей шифрования.
 * Инкапсулирует логику выбора между Mock и Production режимами.
 */
export function useChatRoomData(propRoomId?: string) {
	const params = useParams({ strict: false }) as Record<
		string,
		string | undefined
	>;
	// Use roomId from props OR params. If neither, it remains undefined.
	const roomId = propRoomId ?? params?.roomId;

	const { user } = useAuthStore();
	const { t } = useTranslation();

	return useQuery({
		queryKey: ["room", roomId, user?.id],
		queryFn: async () => {
			if (!user) throw new Error("Unauthorized");
			// TS guard: ensure roomId is string inside this function
			if (!roomId) throw new Error("Room ID required");

			// 1. Mock Mode Strategy
			if (import.meta.env.VITE_USE_MOCK === "true") {
				return fetchMockRoomData(roomId, user.id, t);
			}

			// 2. Production Strategy
			return fetchProductionRoomData(roomId, user.id, t);
		},
		// Only run query if we have both user AND a valid roomId string
		enabled: !!user && !!roomId,
	});
}

/**
 * Стратегия загрузки для Mock-режима
 */
async function fetchMockRoomData(roomId: string, userId: string, t: TFunction) {
	// FALLBACK для старых mock-ссылок dm-user1-user2
	if (roomId.startsWith("dm-")) {
		const parts = roomId.replace("dm-", "").split("-");
		const otherUserId = parts.find((id) => id !== userId) || parts[1];

		const mockKey = await window.crypto.subtle.generateKey(
			{ name: "AES-GCM", length: 256 },
			true,
			["encrypt", "decrypt"],
		);

		return {
			room: {
				id: roomId,
				name: null,
				avatar_url: null,
				type: "direct",
				created_at: new Date().toISOString(),
				is_ephemeral: false,
				room_members: [],
			} as RoomWithMembers,
			roomKey: mockKey,
			otherUserId,
		};
	}

	// Стандартная загрузка из Mock DB
	const { data: roomData, error } = await supabase
		.from(DB_TABLES.ROOMS)
		.select(`
            *,
            room_members (
                user_id,
                profiles (display_name, username, avatar_url)
            )
        `)
		.eq("id", roomId)
		.single();

	if (error || !roomData) {
		throw new Error(t("chat.errors.accessDenied"));
	}

	const typedRoom = roomData as unknown as RoomWithMembers;
	let otherUserId: string | undefined;

	if (typedRoom.type === "direct") {
		otherUserId = typedRoom.room_members?.find(
			(m) => m.user_id !== userId,
		)?.user_id;
	}

	// В Mock-режиме генерируем свежий ключ
	const mockKey = await window.crypto.subtle.generateKey(
		{ name: "AES-GCM", length: 256 },
		true,
		["encrypt", "decrypt"],
	);

	return {
		room: typedRoom,
		roomKey: mockKey,
		otherUserId,
	};
}

/**
 * Стратегия загрузки для Production-режима
 */
async function fetchProductionRoomData(
	roomId: string,
	userId: string,
	t: TFunction,
) {
	// 1. Загружаем метаданные комнаты
	const { data: roomData, error: roomError } = await supabase
		.from(DB_TABLES.ROOMS)
		.select(`
            *,
            room_members (
                user_id,
                profiles (display_name, username, avatar_url)
            )
        `)
		.eq("id", roomId)
		.single();

	if (roomError || !roomData) {
		throw new Error(t("chat.errors.accessDenied"));
	}

	const typedRoom = roomData as unknown as RoomWithMembers;

	// 2. Загружаем зашифрованный ключ
	const { data: keyData, error: keyError } = await supabase
		.from(DB_TABLES.ROOM_KEYS)
		.select("encrypted_key")
		.eq("room_id", roomId)
		.eq("user_id", userId)
		.single();

	if (keyError || !keyData) {
		throw new Error(t("chat.errors.accessDenied"));
	}

	// 3. Загружаем Identity Key
	const identity = await getKeyPair("identity");
	if (!identity) {
		throw new Error(t("chat.errors.keysMissing"));
	}

	// 4. Расшифровываем ключ комнаты
	const encryptedData = JSON.parse(keyData.encrypted_key);
	const roomKey = await unwrapRoomKey(
		{
			ephemeralPublicKey: base64ToArrayBuffer(encryptedData.ephemeralPublicKey),
			iv: base64ToArrayBuffer(encryptedData.iv),
			ciphertext: base64ToArrayBuffer(encryptedData.ciphertext),
		},
		identity.privateKey,
	);

	// 5. Определяем собеседника для DM
	let otherUserId: string | undefined;
	if (typedRoom.type === "direct") {
		otherUserId = typedRoom.room_members?.find(
			(m) => m.user_id !== userId,
		)?.user_id;
	}

	return {
		room: typedRoom,
		roomKey,
		otherUserId,
	};
}
