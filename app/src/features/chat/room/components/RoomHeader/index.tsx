import { useChatRoomStore } from "../../store";
import { DefaultHeader } from "./components/DefaultHeader";
import { SelectionHeader } from "./components/SelectionHeader";

interface RoomHeaderProps {
    /** ID комнаты */
    roomId: string;
}

/**
 * Шапка комнаты чата.
 * Маршрутизатор (Switcher): выбирает нужный автономный заголовок на основе стейта.
 */
export function RoomHeader({ roomId }: RoomHeaderProps) {
    const selectedCount = useChatRoomStore((s) => s.selectedMessageIds.size);

    if (selectedCount > 0) {
        return <SelectionHeader roomId={roomId} />;
    }

    return <DefaultHeader roomId={roomId} />;
}
