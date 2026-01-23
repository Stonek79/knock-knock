-- Добавление флага эфемерности в таблицу комнат
ALTER TABLE rooms ADD COLUMN is_ephemeral BOOLEAN DEFAULT FALSE;

-- Обновление политик для сообщений: разрешить удаление участникам комнаты
CREATE POLICY "Участники могут удалять сообщения в своих комнатах"
ON messages FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM room_members
        WHERE room_members.room_id = messages.room_id
        AND room_members.user_id = auth.uid()
    )
);

-- Обновление политик для комнат: разрешить удаление эфемерных комнат их создателями/админами
CREATE POLICY "Админы могут удалять свои комнаты"
ON rooms FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM room_members
        WHERE room_members.room_id = rooms.id
        AND room_members.user_id = auth.uid()
        AND room_members.role = 'admin'
    )
);
