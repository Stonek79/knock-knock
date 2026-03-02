/**
 * Тип участника группы из объединённых данных room_members + profiles.
 * Используется для отображения в GroupInfoPanel.
 */
export type GroupMember = {
    user_id: string;
    role: string;
    profiles: {
        display_name: string;
        username: string;
        avatar_url: string | null;
    } | null;
    joined_at: string;
};
