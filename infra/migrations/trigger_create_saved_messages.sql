-- Триггер для автоматического создания чата "Избранное" (Saved Messages) при регистрации пользователя

CREATE OR REPLACE FUNCTION public.handle_new_user_saved_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
BEGIN
  -- 1. Генерируем ID комнаты (можно использовать детерминированный, но для простоты пусть будет random, 
  --    так как мы сохраняем связь в room_members, и клиент найдет её по составу участников)
  --    Однако, для оптимизации на клиенте мы хотели детерминированный. 
  --    НО sql функция gen_random_uuid() не может сделать детерминированный ID из user_id также легко как JS.
  --    Поэтому используем обычный UUID. Клиентская логика findOrCreateDM найдет эту комнату 
  --    потому что в ней 1 участник = текущий юзер.
  
  v_room_id := gen_random_uuid();

  -- 2. Создаем комнату
  INSERT INTO public.rooms (id, type, name)
  VALUES (v_room_id, 'direct', NULL); -- name NULL is standard for DMs

  -- 3. Добавляем пользователя участником
  INSERT INTO public.room_members (room_id, user_id, role)
  VALUES (v_room_id, NEW.id, 'member');

  RETURN NEW;
END;
$$;

-- Создаем триггер, который срабатывает после вставки в таблицу profiles (которая создается после auth.users)
DROP TRIGGER IF EXISTS on_profile_created_saved_messages ON public.profiles;

CREATE TRIGGER on_profile_created_saved_messages
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_saved_messages();
