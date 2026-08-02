/**
 * SERVICE: INVITE
 * Бизнес-логика работы с приглашениями.
 */

import { ERROR_CODES } from "../constants";
import { inviteRepository } from "../repositories/invite.repository";
import type { InviteRepoError, Result } from "../types";
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
     * Получить инвайт и проверить его валидность (срок и лимиты).
     */
    validateInvite: async <T = unknown>(
        token: string,
    ): Promise<Result<InvitesResponse<T>, InviteRepoError>> => {
        const res = await inviteRepository.getInviteByToken<T>(token);

        if (res.isErr()) {
            return err(res.error);
        }

        const invite = res.value;

        // Проверка лимита использований
        if (
            invite.max_uses &&
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
            if (expireDate < new Date()) {
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
     * Вступление по инвайту (Подготовка к Этапу 5).
     * Сейчас возвращает заглушку, так как для безопасного вступления
     * понадобится кастомный серверный эндпоинт (RPC),
     * который атомарно увеличит uses_count и добавит в room_members.
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
