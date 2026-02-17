-- Исправление ошибки бесконечной рекурсии (infinite recursion) в RLS политике room_members

-- 1. Создаем SECURITY DEFINER функцию для проверки членства.
-- SECURITY DEFINER означает, что функция выполняется с правами создателя (postgres),
-- игнорируя RLS политики таблицы, к которой идет запрос. Это разрывает цикл рекурсии.
CREATE OR REPLACE FUNCTION public.is_member_of_room(_room_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Безопасность: фиксируем search_path
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.room_members
    WHERE room_id = _room_id
    AND user_id = _user_id
  );
END;
$$;

-- 2. Удаляем старую рекурсивную политику
DROP POLICY IF EXISTS "Пользователи видят участников своих комнат" ON public.room_members;

-- 3. Создаем новую безопасную политику
CREATE POLICY "Пользователи видят участников своих комнат"
ON public.room_members FOR SELECT
USING (
    public.is_member_of_room(room_id, auth.uid())
);
