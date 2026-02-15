-- Добавляем колонку last_message_id в таблицу rooms
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS last_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Функция для обновления last_message_id при вставке нового сообщения
CREATE OR REPLACE FUNCTION public.update_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.rooms
    SET last_message_id = NEW.id
    WHERE id = NEW.room_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер
DROP TRIGGER IF EXISTS on_message_inserted_update_room ON public.messages;
CREATE TRIGGER on_message_inserted_update_room
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_room_last_message();

-- Обновляем существующие комнаты (если есть сообщения)
WITH latest_messages AS (
    SELECT DISTINCT ON (room_id) id, room_id, created_at
    FROM public.messages
    ORDER BY room_id, created_at DESC
)
UPDATE public.rooms r
SET last_message_id = lm.id
FROM latest_messages lm
WHERE r.id = lm.room_id AND r.last_message_id IS NULL;
