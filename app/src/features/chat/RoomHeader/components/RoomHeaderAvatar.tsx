import { Avatar } from "@radix-ui/themes";

interface RoomHeaderAvatarProps {
    /** URL изображения */
    src?: string;
    /** Текст-плейсхолдер (одна буква или эмодзи) */
    fallback: string;
}

/**
 * Компонент аватара для заголовка комнаты.
 */
export function RoomHeaderAvatar({ src, fallback }: RoomHeaderAvatarProps) {
    return (
        <Avatar
            src={src}
            fallback={fallback}
            radius="full"
            size="2"
            color="gray"
        />
    );
}
