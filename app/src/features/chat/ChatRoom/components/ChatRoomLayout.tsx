import type { ReactNode } from "react";
import { Flex } from "@/components/layout/Flex";
import styles from "../chatroom.module.css";

interface ChatRoomLayoutProps {
    header: ReactNode;
    banner?: ReactNode;
    messages: ReactNode;
    input: ReactNode;
    dialogs: ReactNode;
}

/**
 * Чистый компонент разметки комнаты чата.
 * Отвечает только за Mobile-First позиционирование блоков.
 */
export function ChatRoomLayout({
    header,
    banner,
    messages,
    input,
    dialogs,
}: ChatRoomLayoutProps) {
    return (
        <Flex direction="column" className={styles.roomWrapper}>
            {dialogs}
            {header}
            {banner}
            {messages}
            <div className={styles.inputArea}>{input}</div>
        </Flex>
    );
}
