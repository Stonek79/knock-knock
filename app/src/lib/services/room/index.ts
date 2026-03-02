import {
    addMembersToGroup,
    createRoom,
    deleteRoom,
    leaveGroup,
    removeMemberFromGroup,
    updateMemberRole,
} from "./mutations";
import { findOrCreateDM } from "./queries";

/**
 * Сервис для управления комнатами (чатами).
 * Отвечает за создание комнат, добавление участников и управление ключами шифрования.
 */
export const RoomService = {
    createRoom,
    deleteRoom,
    findOrCreateDM,
    addMembersToGroup,
    removeMemberFromGroup,
    updateMemberRole,
    leaveGroup,
};
