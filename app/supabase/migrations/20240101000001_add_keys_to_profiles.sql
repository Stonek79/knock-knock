-- Добавление колонок для публичных ключей шифрования
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS public_key_x25519 TEXT,
ADD COLUMN IF NOT EXISTS public_key_signing TEXT;

-- Комментарии к колонкам
COMMENT ON COLUMN profiles.public_key_x25519 IS 'Публичный ключ X25519 для протокола Diffie-Hellman (шифрование ключей комнат)';
COMMENT ON COLUMN profiles.public_key_signing IS 'Публичный ключ Ed25519 для проверки подписей сообщений';
