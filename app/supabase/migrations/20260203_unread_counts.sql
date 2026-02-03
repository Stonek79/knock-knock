-- Migration: Add Unread Counters Support
-- Description: Adds 'last_read_at' to room_members and an RPC to count unread messages.

-- 1. Add last_read_at to room_members
ALTER TABLE room_members 
ADD COLUMN IF NOT EXISTS last_read_at timestamptz DEFAULT now();

-- 2. Create RPC to get unread counts
-- Returns: list of { room_id, count }
CREATE OR REPLACE FUNCTION get_unread_counts()
RETURNS TABLE (
    room_id uuid,
    count bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rm.room_id,
        COUNT(m.id) as count
    FROM room_members rm
    JOIN messages m ON m.room_id = rm.room_id
    WHERE 
        rm.user_id = auth.uid()
        AND m.created_at > rm.last_read_at
        AND m.sender_id != auth.uid() -- Don't count own messages
        AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)
    GROUP BY rm.room_id;
END;
$$;

-- 3. Create RPC to mark room as read
CREATE OR REPLACE FUNCTION mark_room_as_read(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE room_members
    SET last_read_at = now()
    WHERE room_id = p_room_id AND user_id = auth.uid();
END;
$$;
