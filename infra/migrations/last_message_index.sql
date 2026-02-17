-- 1. Индексы для ускорения поиска последних сообщений
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON public.messages (room_id, created_at DESC);

-- 2. Обновление last_message_id в комнатах (если еще не заполнено)
UPDATE public.rooms r
SET last_message_id = (
    SELECT id 
    FROM public.messages m 
    WHERE m.room_id = r.id 
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE last_message_id IS NULL;

-- 3. Триггер для автоматического обновления last_message_id
CREATE OR REPLACE FUNCTION public.update_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.rooms
    SET last_message_id = NEW.id
    WHERE id = NEW.room_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_room_last_message ON public.messages;
CREATE TRIGGER tr_update_room_last_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_room_last_message();

-- 4. Проверка RLS (Разрешить чтение связанных сообщений через JOIN)
-- Убедитесь, что политика SELECT на public.messages позволяет читать сообщения в комнатах, где пользователь является участником.
