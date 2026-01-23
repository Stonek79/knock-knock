-- Создание ENUM типов
CREATE TYPE room_type AS ENUM ('direct', 'group');
CREATE TYPE member_role AS ENUM ('admin', 'member');

-- 1. Таблица Комнат (Rooms)
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    type room_type NOT NULL,
    name TEXT -- Может быть NULL (для личных чатов)
);

-- 2. Таблица Участников Комнаты (Room Members)
CREATE TABLE room_members (
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role member_role DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- 3. Таблица Ключей Комнаты (Room Keys)
-- Хранит зашифрованный AES ключ для каждого участника
CREATE TABLE room_keys (
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    encrypted_key TEXT NOT NULL, -- Зашифрованный ключ (Base64)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- 4. Таблица Сообщений (Messages)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL, -- Зашифрованный контент (Base64)
    iv TEXT NOT NULL, -- Вектор инициализации для AES
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Включение RLS (Row Level Security)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Политики RLS

-- КОМНАТЫ (ROOMS)
-- Пользователи видят комнаты, в которых они состоят
CREATE POLICY "Пользователи видят свои комнаты"
ON rooms FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM room_members
        WHERE room_members.room_id = rooms.id
        AND room_members.user_id = auth.uid()
    )
);

-- Пользователи могут создавать комнаты
CREATE POLICY "Пользователи могут создавать комнаты"
ON rooms FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- УЧАСТНИКИ (ROOM MEMBERS)
-- Пользователи видят участников своих комнат
CREATE POLICY "Пользователи видят участников своих комнат"
ON room_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM room_members as rm
        WHERE rm.room_id = room_members.room_id
        AND rm.user_id = auth.uid()
    )
);

-- Пользователи могут добавлять участников (упрощенно)
CREATE POLICY "Пользователи могут добавлять участников"
ON room_members FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- КЛЮЧИ КОМНАТЫ (ROOM KEYS)
-- Пользователь может получить ТОЛЬКО СВОЮ копию ключа
CREATE POLICY "Пользователь видит только свой ключ"
ON room_keys FOR SELECT
USING (user_id = auth.uid());

-- Пользователи могут добавлять ключи (для других при создании группы)
CREATE POLICY "Пользователи могут добавлять ключи"
ON room_keys FOR INSERT
WITH CHECK (
    -- Разрешено, если пользователь участник комнаты
    EXISTS (
        SELECT 1 FROM room_members
        WHERE room_members.room_id = room_keys.room_id
        AND room_members.user_id = auth.uid()
    )
    OR
    -- Разрешено при инициализации (когда членство создается в той же транзакции)
    auth.uid() IS NOT NULL
);

-- СООБЩЕНИЯ (MESSAGES)
-- Члены комнаты видят сообщения
CREATE POLICY "Участники видят сообщения"
ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM room_members
        WHERE room_members.room_id = messages.room_id
        AND room_members.user_id = auth.uid()
    )
);

-- Члены комнаты могут отправлять сообщения
CREATE POLICY "Участники могут писать сообщения"
ON messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
    AND
    EXISTS (
        SELECT 1 FROM room_members
        WHERE room_members.room_id = messages.room_id
        AND room_members.user_id = auth.uid()
    )
);

-- Настройка Realtime (публикация для Supabase Realtime)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- Добавляем таблицы в публикацию Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_members;
