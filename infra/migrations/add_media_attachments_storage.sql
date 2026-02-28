-- Добавляем колонку attachments (массив JSON-объектов)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachments JSONB[] DEFAULT NULL;

-- Создаем приватные бакеты
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_media', 'chat_media', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_audio', 'chat_audio', false)
ON CONFLICT (id) DO NOTHING;

-- Включаем RLS для storage.objects (если еще не включен)
-- Вручную или если уже есть

-- Политика: участники комнаты могут читать медиа
-- Мы предполагаем конвенцию путей: {room_id}/{uuid}.ext
CREATE POLICY "Room members can read chat media"
ON storage.objects FOR SELECT
USING (
    bucket_id IN ('chat_media', 'chat_audio') AND
    auth.uid() IN (
        SELECT user_id FROM room_members 
        WHERE room_id = CAST((string_to_array(name, '/'))[1] AS UUID)
    )
);

-- Политика: участники комнаты могут загружать медиа
CREATE POLICY "Room members can upload chat media"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id IN ('chat_media', 'chat_audio') AND
    auth.uid() IN (
        SELECT user_id FROM room_members 
        WHERE room_id = CAST((string_to_array(name, '/'))[1] AS UUID)
    )
);
