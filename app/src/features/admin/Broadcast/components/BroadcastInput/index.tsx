import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Text } from "@/components/ui/Text";
import { MessageInput } from "@/features/chat/message";
import { COMPONENT_INTENT } from "@/lib/constants";
import styles from "./broadcast-input.module.css";

interface BroadcastInputProps {
    /** Колбэк отправки сообщения */
    onSend: (text: string, files?: File[], audioBlob?: Blob) => Promise<void>;
    /** Флаг загрузки (отправки) */
    isLoading: boolean;
    /** Текущий статус отправки */
    status: {
        type: typeof COMPONENT_INTENT.SUCCESS | typeof COMPONENT_INTENT.ERROR;
        message: string;
    } | null;
}

/**
 * Компонент ввода рассылки.
 * Закрепляется снизу экрана, рендерит форму ввода сообщения и медиафайлов.
 */
export function BroadcastInput({
    onSend,
    isLoading,
    status,
}: BroadcastInputProps) {
    return (
        <Box className={styles.inputArea}>
            <Flex direction="column" gap="2" className={styles.innerContainer}>
                {status && (
                    <Text
                        size="sm"
                        intent={
                            status.type === COMPONENT_INTENT.SUCCESS
                                ? COMPONENT_INTENT.PRIMARY
                                : COMPONENT_INTENT.DANGER
                        }
                        className={styles.statusText}
                    >
                        {status.message}
                    </Text>
                )}

                <div className={styles.inputWrapper}>
                    <MessageInput onSend={onSend} disabled={isLoading} />
                </div>
            </Flex>
        </Box>
    );
}
