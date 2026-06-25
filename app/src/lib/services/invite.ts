import { inviteRepository } from "../repositories/invite.repository";
import type { InviteRepoError, Result } from "../types";

export const InviteService = {
    /**
     * Сгенерировать новый код приглашения
     */
    generateInvite: async (): Promise<
        Result<{ code: string }, InviteRepoError>
    > => {
        return inviteRepository.generateInvite();
    },
};
