import { MESSAGE_STATUS, QUERY_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { messageRepository } from "@/lib/repositories/message.repository";
import { queryClient } from "@/main"; // Need to check how queryClient is exported, or pass it
import { outboxDb } from "./outbox-db";

export const SyncService = {
    isSyncing: false,

    async syncOutbox(userId: string) {
        if (this.isSyncing || !navigator.onLine) {
            return;
        }
        this.isSyncing = true;

        try {
            const messages = await outboxDb.getAll(userId);
            for (const msg of messages) {
                // Пытаемся отправить сообщение
                const result = await messageRepository.sendMessage({
                    room: msg.roomId,
                    sender: msg.senderId,
                    content: msg.content,
                    iv: msg.iv,
                    attachments: msg.attachments ?? null,
                    status: MESSAGE_STATUS.SENT,
                    metadata: { deleted_by: [], ...msg.metadata },
                });

                if (result.isOk()) {
                    // Удаляем из outbox
                    await outboxDb.remove(userId, msg.id);

                    // Оповестить UI, что сообщение отправлено
                    queryClient.invalidateQueries({
                        queryKey: QUERY_KEYS.messages(msg.roomId),
                    });
                } else {
                    logger.error(
                        `Ошибка синхронизации сообщения ${msg.id}`,
                        result.error,
                    );
                }
            }
        } catch (e) {
            logger.error("Ошибка при выполнении background sync", e);
        } finally {
            this.isSyncing = false;
        }
    },

    init(userId: string) {
        window.addEventListener("online", () => {
            logger.info("Сеть появилась, запускаем синхронизацию...");
            this.syncOutbox(userId);
        });

        // Запуск при старте, если уже online
        if (navigator.onLine) {
            this.syncOutbox(userId);
        }
    },
};
