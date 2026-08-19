/**
 * SERVICE: INVITE
 * Бизнес-логика работы с приглашениями.
 */

import { ERROR_CODES } from "../constants";
import { inviteRepository } from "../repositories/invite.repository";
import type { InviteRepoError, Result, RoomInvitePreviewDto } from "../types";
import type { InvitesRecord, InvitesResponse } from "../types/pocketbase-types";
import { appError, err, ok } from "../utils/result";

export const inviteService = {
    /**
     * Сгенерировать новый код приглашения для пользователя.
     */
    generateUserInvite: async (): Promise<
        Result<{ code: string }, InviteRepoError>
    > => {
        return inviteRepository.generateInvite();
    },

    /**
     * Генерирует новый инвайт для комнаты.
     * Автоматически создает уникальный токен.
     */
    generateInvite: async (
        roomId: string,
        createdBy: string,
        maxUses?: number,
        expiresAt?: string,
    ): Promise<Result<InvitesResponse, InviteRepoError>> => {
        // Генерация безопасного токена (например, 32 символа)
        const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        const inviteData: InvitesRecord = {
            room: roomId,
            token,
            created_by: createdBy,
            max_uses: maxUses ?? 0,
            uses_count: 0,
        };

        if (expiresAt) {
            inviteData.expires_at = expiresAt;
        }

        return inviteRepository.createInvite(inviteData);
    },

    /**
     * Получить и проверить room invite по его токену.
     * Эндпоинт /api/custom/invites/validate уже отклоняет истёкшие и
     * исчерпанные invite fail-closed и возвращает узкий DTO. Ниже — только
     * защитная клиентская проверка, не ожидающая полную запись Invites.
     */
    validateInvite: async (
        token: string,
    ): Promise<Result<RoomInvitePreviewDto, InviteRepoError>> => {
        const res = await inviteRepository.getInviteByToken(token);

        if (res.isErr()) {
            return err(res.error);
        }

        const invite = res.value;

        // Проверка лимита использований
        if (
            invite.max_uses > 0 &&
            (invite.uses_count ?? 0) >= invite.max_uses
        ) {
            return err(
                appError(
                    ERROR_CODES.FORBIDDEN_ERROR,
                    "Лимит использований данного приглашения исчерпан.",
                ),
            );
        }

        // Проверка срока жизни
        if (invite.expires_at) {
            const expireDate = new Date(invite.expires_at);
            if (Number.isNaN(expireDate.getTime()) || expireDate < new Date()) {
                return err(
                    appError(
                        ERROR_CODES.FORBIDDEN_ERROR,
                        "Срок действия приглашения истек.",
                    ),
                );
            }
        }

        return ok(invite);
    },

    /**
     * Вступление по инвайту через серверный endpoint.
     * Endpoint повторно проверяет токен, увеличивает uses_count, добавляет
     * room_members и персональный зашифрованный ключ. Примечание: расходование
     * через серверный endpoint пока не является runtime-подтверждённо атомарным
     * (см. BLOCKER по конкурентному использованию в TESTING_PLAN/CURRENT_STATE).
     */
    joinRoomByToken: async (
        token: string,
        roomMasterKeyEncrypted: string,
    ): Promise<Result<boolean, InviteRepoError>> => {
        const validateRes = await inviteService.validateInvite(token);
        if (validateRes.isErr()) {
            return err(validateRes.error);
        }

        return inviteRepository.joinRoom(token, roomMasterKeyEncrypted);
    },
};
