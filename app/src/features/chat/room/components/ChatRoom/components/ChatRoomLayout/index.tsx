import type { ReactNode } from "react";
import { Flex } from "@/components/layout/Flex";
import styles from "./chatroom-layout.module.css";

interface ChatRoomLayoutProps {
    header: ReactNode;
    banner?: ReactNode;
    messages: ReactNode;
    input: ReactNode;
    dialogs: ReactNode;
}

/**
 * Базовый layout комнаты: флекс-контейнер на всю высоту, скрывающий overflow.
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
            {header}
            {banner}
            {messages}
            {input}
            {dialogs}
        </Flex>
    );
}
