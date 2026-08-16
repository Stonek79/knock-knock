import { encryptRoomKeysForMembers } from "./crypto";
import {
    addMembersToGroup,
    createRoom,
    deleteRoom,
    leaveGroup,
    removeMemberFromGroup,
    updateMemberRole,
} from "./mutations";
import {
    findOrCreateDM,
    getChatRoomData,
    getFavoriteRooms,
    getRoomUnreadCounts,
    getUserRooms,
    getUserRoomsWithLastMessages,
} from "./queries";

/**
 * Объект-фасад сервиса комнат.
 */
export const RoomService = {
    // Queries (получение данных)
    findOrCreateDM,
    getChatRoomData,
    getFavoriteRooms,
    getUserRooms,
    getUserRoomsWithLastMessages,
    getRoomUnreadCounts,

    // Mutations (изменение данных)
    createRoom,
    deleteRoom,
    addMembersToGroup,
    removeMemberFromGroup,
    updateMemberRole,
    leaveGroup,

    // Крипто-утилиты
    encryptRoomKeysForMembers,
} as const;

// Реекспорт отдельных функций для прямого импорта (если нужно)
export {
    encryptRoomKeysForMembers,
    addMembersToGroup,
    createRoom,
    deleteRoom,
    leaveGroup,
    removeMemberFromGroup,
    updateMemberRole,
    findOrCreateDM,
    getChatRoomData,
    getFavoriteRooms,
    getRoomUnreadCounts,
    getUserRooms,
    getUserRoomsWithLastMessages,
};
