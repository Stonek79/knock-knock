-- 0. Таблица Профилей (Profiles)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Включение RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Профили видны всем" ON profiles FOR SELECT USING (true);
CREATE POLICY "Пользователи могут менять свой профиль" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Пользователи могут создавать свой профиль" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Триггер для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
