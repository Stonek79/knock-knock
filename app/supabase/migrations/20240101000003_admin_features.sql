-- 1. Добавляем роль в профили
CREATE TYPE app_role AS ENUM ('user', 'admin');
ALTER TABLE profiles ADD COLUMN role app_role DEFAULT 'user';

-- 2. Функция проверки админа (SECURITY DEFINER чтобы читать profiles даже если RLS запрещает)
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Политики "Всемогущего Админа" для всех таблиц

-- PROFILES
CREATE POLICY "Admins can do everything with profiles" 
ON profiles 
FOR ALL 
USING (is_admin());

-- ROOMS
CREATE POLICY "Admins can do everything with rooms" 
ON rooms 
FOR ALL 
USING (is_admin());

-- ROOM MEMBERS
CREATE POLICY "Admins can do everything with members" 
ON room_members 
FOR ALL 
USING (is_admin());

-- ROOM KEYS
CREATE POLICY "Admins can do everything with keys" 
ON room_keys 
FOR ALL 
USING (is_admin());

-- MESSAGES
CREATE POLICY "Admins can do everything with messages" 
ON messages 
FOR ALL 
USING (is_admin());

-- 4. Ставим роль админа текущему пользователю (ВАЖНО: Замените UUID или используйте auth.uid() в консоли)
-- UPDATE profiles SET role = 'admin' WHERE id = 'ВАШ_ID';
