import { useTranslation } from "react-i18next";
import { Container } from "@/components/layout/Container";
import { Flex } from "@/components/layout/Flex";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { ROOM_TYPE } from "@/lib/constants";
import { getErrorMessage } from "@/lib/utils/result";
import { RoomHeader } from "../..";
import { useChatRoomData } from "../../hooks/useChatRoomData";
import { ChatRoomProvider } from "../../store";
import { ChatRoomDialogs } from "./components/ChatRoomDialogs";
import { ChatRoomGroupInfo } from "./components/ChatRoomGroupInfo";
import { ChatRoomInputArea } from "./components/ChatRoomInputArea";
import { ChatRoomLayout } from "./components/ChatRoomLayout";
import { ChatRoomMessages } from "./components/ChatRoomMessages";
import { PrivacyBanner } from "./components/PrivacyBanner";

interface ChatRoomProps {
    roomId: string;
}

/**
 * Основной компонент комнаты чата.
 * Служит входной точкой, оборачивает контент в Provider и управляет Layout.
 */
export function ChatRoom({ roomId }: ChatRoomProps) {
    return (
        <ChatRoomProvider key={roomId}>
            <ChatRoomInternal roomId={roomId} />
        </ChatRoomProvider>
    );
}

/**
 * Внутренний контент комнаты — тонкий оркестратор.
 *
 * Отвечает только за: загрузку room (для guard и Privacy Banner), error/loading стейты и Layout.
 */
function ChatRoomInternal({ roomId }: { roomId: string }) {
    const { t } = useTranslation();
    const { data: roomInfo, isLoading, error } = useChatRoomData(roomId);
    const room = roomInfo?.room;

    if (isLoading) {
        return (
            <Flex justify="center" align="center" height="100%">
                <span>{t("common.loading", "Загрузка чата...")}</span>
            </Flex>
        );
    }

    if (error) {
        return (
            <Container size="1" p="4">
                <Alert variant="danger">
                    <AlertTitle>
                        {t("common.error", "Ошибка доступа")}
                    </AlertTitle>
                    <AlertDescription>
                        {getErrorMessage(error) ?? t("common.unknownError")}
                    </AlertDescription>
                </Alert>
            </Container>
        );
    }

    if (!room) {
        return null;
    }

    return (
        <ChatRoomLayout
            header={<RoomHeader roomId={roomId} />}
            banner={
                room.type === ROOM_TYPE.EPHEMERAL ? (
                    <PrivacyBanner />
                ) : undefined
            }
            messages={<ChatRoomMessages roomId={roomId} />}
            input={<ChatRoomInputArea roomId={roomId} />}
            dialogs={
                <>
                    <ChatRoomDialogs roomId={roomId} />
                    <ChatRoomGroupInfo roomId={roomId} />
                </>
            }
        />
    );
}
