/**
 * Публичный API модуля chat.
 * Экспортируем только те компоненты, которые используются за пределами feature.
 */

export { CreateChatDialog, CreateGroupDialog } from "./creation";
export { ChatList, FavoritesChatList } from "./list";
export {
    ChatPlaceholder,
    ChatRoom,
    DMInitializer,
    RoomHeader,
    validateDMSearch,
} from "./room";
