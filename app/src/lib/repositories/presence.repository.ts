import { ERROR_CODES } from "@/lib/constants";
import { API_ROUTES } from "@/lib/constants/routes";
import { pb } from "@/lib/pocketbase";
import type {
    PBPresenceStatus,
    PBRealtimeEvent,
    PresenceRepoError,
} from "@/lib/types";
import { appError, fromPromise, type Result } from "@/lib/utils/result";

/**
 * DTO собственной записи присутствия (POST /api/custom/presence/me).
 */
export type PresenceOwnDto = {
    id: string;
    is_online: boolean;
    is_typing: boolean;
    room_id?: string;
    last_ping?: string;
    display_name?: string | null;
};

/**
 * DTO печатающего участника комнаты (GET /api/custom/presence/room/:roomId).
 * display_name генерируется сервером privacy-safe (null для non-public).
 */
export type PresenceTypingDto = {
    user_id: string;
    is_typing: boolean;
    last_ping?: string;
    display_name?: string | null;
};

/**
 * DTO присутствия пользователя, с которым есть общая комната
 * (GET /api/custom/presence/shared). Заменяет закрытый глобальный list/view.
 */
export type PresenceSharedDto = {
    user_id: string;
    is_online: boolean;
    last_ping?: string;
};

const mapError =
    (message: string) =>
    (e: unknown): PresenceRepoError =>
        appError(ERROR_CODES.NETWORK_ERROR, message, e) as PresenceRepoError;

const post = <T>(route: string, body: Record<string, unknown>) =>
    pb.send<T>(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

/**
 * Репозиторий присутствия.
 * Прямой доступ к коллекции `presence_status` закрыт (rules = null);
 * всё чтение/write идёт через server-owned маршруты, выполняющие
 * owner/membership-проверки. Ошибки мапятся в тот же typed Result-контракт.
 */
export const presenceRepository = {
    /**
     * Owner-only upsert: создаёт или возвращает собственную запись присутствия
     * (используется на старте сессии и как heartbeat).
     */
    ensureOwnPresence: async (): Promise<
        Result<PresenceOwnDto, PresenceRepoError>
    > =>
        fromPromise(
            post<PresenceOwnDto>(API_ROUTES.PRESENCE_ME, {}),
            mapError("Ошибка при получении/создании статуса присутствия"),
        ),

    /**
     * Heartbeat: обновляет is_online/last_ping только собственной записи.
     */
    updatePresence: async (
        id: string,
        isOnline: boolean,
    ): Promise<Result<PresenceOwnDto, PresenceRepoError>> =>
        fromPromise(
            post<PresenceOwnDto>(API_ROUTES.PRESENCE_ME, {
                record_id: id,
                is_online: isOnline,
            }),
            mapError("Ошибка при обновлении статуса присутствия"),
        ),

    /**
     * Обновление typing-статуса в комнате, участником которой пользователь
     * является (сервер проверяет membership).
     */
    updateTypingStatus: async (
        id: string,
        isTyping: boolean,
        roomId: string,
    ): Promise<Result<PresenceOwnDto, PresenceRepoError>> =>
        fromPromise(
            post<PresenceOwnDto>(API_ROUTES.PRESENCE_TYPING, {
                record_id: id,
                is_typing: isTyping,
                room_id: roomId,
            }),
            mapError("Ошибка при обновлении статуса печати"),
        ),

    /**
     * Присутствие пользователей, с которыми есть общая комната (плюс себя).
     * Заменяет закрытый глобальный list/view.
     */
    getSharedPresence: async (): Promise<
        Result<PresenceSharedDto[], PresenceRepoError>
    > =>
        fromPromise(
            pb.send<PresenceSharedDto[]>(API_ROUTES.PRESENCE_SHARED, {
                method: "GET",
            }),
            mapError("Ошибка при получении статусов участников"),
        ),

    /**
     * Печатающие участники комнаты (membership-gated).
     */
    getTypingUsersByRoom: async (
        roomId: string,
    ): Promise<Result<PresenceTypingDto[], PresenceRepoError>> =>
        fromPromise(
            pb.send<PresenceTypingDto[]>(API_ROUTES.PRESENCE_ROOM(roomId), {
                method: "GET",
            }),
            mapError("Ошибка при получении печатающих пользователей"),
        ),

    /**
     * Подписка на изменения статусов присутствия.
     */
    subscribeToPresence: (
        callback: (event: PBRealtimeEvent<PBPresenceStatus>) => void,
    ) => {
        let disposed = false;
        let previous = new Map<string, PresenceSharedDto>();

        const emit = (presence: PresenceSharedDto): void => {
            const record = {
                id: presence.user_id,
                encrypted_user_id: presence.user_id,
                is_online: presence.is_online,
                is_typing: false,
                last_ping: presence.last_ping || "",
                room_id: "",
            } as PBPresenceStatus;
            callback({ action: "update", record });
        };

        const poll = async (): Promise<void> => {
            const result = await presenceRepository.getSharedPresence();
            if (disposed || result.isErr()) {
                return;
            }

            const current = new Map(
                result.value.map((presence) => [presence.user_id, presence]),
            );
            for (const [userId, presence] of current) {
                const old = previous.get(userId);
                if (
                    !old ||
                    old.is_online !== presence.is_online ||
                    old.last_ping !== presence.last_ping
                ) {
                    emit(presence);
                }
            }
            for (const userId of previous.keys()) {
                if (!current.has(userId)) {
                    emit({
                        user_id: userId,
                        is_online: false,
                        last_ping: "",
                    });
                }
            }
            previous = current;
        };

        void poll();
        const interval = setInterval(() => void poll(), 5000);

        return () => {
            disposed = true;
            clearInterval(interval);
        };
    },
};
