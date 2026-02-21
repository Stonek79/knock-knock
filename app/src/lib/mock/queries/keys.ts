import type { QueryHandler, QueryState } from "./types";

export const handleRoomKeysQuery: QueryHandler<unknown> = async (
	state: QueryState,
) => {
	// В текущем моке мы всегда возвращаем фиктивный ключ
	// Реальной базы ключей в mock/state.ts нет, так как шифрование в моке
	// эмулируется (или используется реальное, но ключи не хранятся персистентно в этом слое как надо).
	// Original client.ts logic:

	if (state.operation === "select") {
		return {
			data: {
				encrypted_key: JSON.stringify({
					ephemeralPublicKey: "mock",
					iv: "mock",
					ciphertext: "mock",
				}),
			},
			error: null,
		};
	}

	if (state.operation === "insert") {
		return { data: null, error: null };
	}

	return { data: null, error: null };
};
