-- Migration: Add Advanced Chat Features
-- Description: Adds support for message statuses (sent/delivered/read), editing, and soft/secure deletion.

-- 1. Add new columns to 'messages' table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Create index for performance on status queries (optional but recommended for unread counts)
CREATE INDEX IF NOT EXISTS idx_messages_status_room_id ON messages(room_id, status);

-- Notes:
-- Secure Delete is handled by the application:
-- UPDATE messages SET is_deleted = true, content = NULL, iv = NULL WHERE id = ...
