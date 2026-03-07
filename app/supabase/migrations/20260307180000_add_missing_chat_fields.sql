-- Migration: add_missing_chat_fields (Fix)
-- Description: Adds 'attachments', 'deleted_by' columns and safely updates 'status' to ENUM in 'messages' table.

-- 1. Добавляем недостающие колонки
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid[] DEFAULT '{}'::uuid[];

-- 2. Создаем ENUM для статусов сообщений
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
        CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
    END IF;
END
$$;

-- 3. Безопасная замена колонки status (Обход ошибки оператора message_status = text)
-- Переименовываем старую колонку
ALTER TABLE public.messages RENAME COLUMN status TO status_old;

-- Создаем новую колонку с нужным типом и дефолтом
ALTER TABLE public.messages ADD COLUMN status message_status DEFAULT 'sent'::message_status;

-- Переносим данные, явно кастуя текст в ENUM
UPDATE public.messages SET status = status_old::text::message_status WHERE status_old IS NOT NULL;

-- Удаляем старую текстовую колонку
ALTER TABLE public.messages DROP COLUMN status_old;
