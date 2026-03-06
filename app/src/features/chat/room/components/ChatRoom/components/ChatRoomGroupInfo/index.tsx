import { useNavigate } from "@tanstack/react-router";
import { useChatRoomData } from "@/features/chat/room/hooks/useChatRoomData";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";
import { GroupInfoPanel } from "../../../GroupInfoPanel";
import { useChatRoomStore } from "../../store";

interface ChatRoomGroupInfoProps {
    /** ID комнаты — единственный необходимый prop */
    roomId: string;
}

/**
 * Контейнер для панели информации о группе.
 *
 * Берёт состояние открытия напрямую из ChatRoomStore,
 * освобождая ChatRoomInternal от передачи этих props.
 */
export function ChatRoomGroupInfo({ roomId }: ChatRoomGroupInfoProps) {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const { data: roomInfo } = useChatRoomData(roomId);
    const room = roomInfo?.room;
    const roomKey = roomInfo?.roomKey;

    const isOpen = useChatRoomStore((s) => s.showGroupInfoPanel);
    const setShowGroupInfoPanel = useChatRoomStore(
        (s) => s.setShowGroupInfoPanel,
    );

    return (
        <GroupInfoPanel
            isOpen={isOpen}
            onOpenChange={setShowGroupInfoPanel}
            room={room}
            roomKey={roomKey}
            myUserId={user?.id}
            onLeaveGroupSuccess={() => {
                navigate({ to: ROUTES.HOME });
            }}
        />
    );
}
