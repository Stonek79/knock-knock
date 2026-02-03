export interface MockUser {
	id: string;
	email: string;
	username: string;
	display_name: string;
	avatar_url?: string;
	role?: "user" | "admin";
}

export interface MockRoom {
	id: string;
	name: string;
	created_at: string;
	type?: "group" | "direct";
	is_ephemeral?: boolean;
}

export interface MockMessage {
	id: string;
	room_id: string;
	sender_id: string;
	content: string;
	created_at: string;
	deleted_by?: string[];
}

/** Вспомогательная функция для генерации времени N минут назад */
export const minutesAgo = (minutes: number): string => {
	const date = new Date();
	date.setMinutes(date.getMinutes() - minutes);
	return date.toISOString();
};

export const MOCK_USERS: MockUser[] = [
	{
		id: "user-1",
		email: "alex@example.com",
		username: "Alex Stone",
		display_name: "Alex",
	},
	{
		id: "user-2",
		email: "elon@spacex.com",
		username: "Elon Musk",
		display_name: "Elon",
	},
	{
		id: "user-3",
		email: "pavel@telegram.org",
		username: "Pavel Durov",
		display_name: "Pavel",
	},
	{
		id: "user-4",
		email: "satoshi@bitcoin.org",
		username: "Satoshi Nakamoto",
		display_name: "Satoshi",
	},
	{
		id: "user-5",
		email: "linus@linux.org",
		username: "Linus Torvalds",
		display_name: "Linus",
	},
	{
		id: "user-6",
		email: "admin@linux.org",
		username: "Admin",
		display_name: "Admin",
		role: "admin",
	},
];

export const MOCK_ROOMS: MockRoom[] = [
	{
		id: "room-1",
		name: "General",
		created_at: minutesAgo(1440),
		type: "group",
		is_ephemeral: false,
	},
	{
		id: "room-2",
		name: "Dev Talk",
		created_at: minutesAgo(720),
		type: "group",
		is_ephemeral: false,
	},
	{
		id: "room-3",
		name: "Crypto Chat 🔐",
		created_at: minutesAgo(360),
		type: "group",
		is_ephemeral: false,
	},
	{
		id: "room-4",
		name: "SpaceX Updates",
		created_at: minutesAgo(120),
		type: "group",
		is_ephemeral: false,
	},
	{
		id: "room-5",
		name: "Linux Kernel",
		created_at: minutesAgo(60),
		type: "group",
		is_ephemeral: false,
	},
];

export const mockMessages: MockMessage[] = [
	// Room 1: General
	{
		id: "msg-1",
		room_id: "room-1",
		sender_id: "user-2",
		content: "To the Mars! 🚀",
		created_at: minutesAgo(30),
	},
	{
		id: "msg-2",
		room_id: "room-1",
		sender_id: "user-3",
		content: "Privacy first.",
		created_at: minutesAgo(25),
	},
	{
		id: "msg-3",
		room_id: "room-1",
		sender_id: "user-1",
		content: "Всем привет! Как дела?",
		created_at: minutesAgo(5),
	},
	// Room 2: Dev Talk
	{
		id: "msg-4",
		room_id: "room-2",
		sender_id: "user-5",
		content: "Read the source code, Luke.",
		created_at: minutesAgo(120),
	},
	{
		id: "msg-5",
		room_id: "room-2",
		sender_id: "user-1",
		content: "Typescript > JavaScript 💪",
		created_at: minutesAgo(60),
	},
	// Room 3: Crypto Chat
	{
		id: "msg-6",
		room_id: "room-3",
		sender_id: "user-4",
		content: "Buy the dip. 📉📈",
		created_at: minutesAgo(15),
	},
	{
		id: "msg-7",
		room_id: "room-3",
		sender_id: "user-3",
		content: "TON — future of Web3.",
		created_at: minutesAgo(10),
	},
	// Room 4: SpaceX
	{
		id: "msg-8",
		room_id: "room-4",
		sender_id: "user-2",
		content: "Starship test flight tomorrow! 🛸",
		created_at: minutesAgo(3),
	},
	// Room 5: Linux Kernel
	{
		id: "msg-9",
		room_id: "room-5",
		sender_id: "user-5",
		content: "New kernel release coming soon.",
		created_at: minutesAgo(45),
	},
	{
		id: "msg-10",
		room_id: "room-5",
		sender_id: "user-1",
		content: "Жду Rust в ядре! 🦀",
		created_at: minutesAgo(20),
	},
];

export interface MockRoomMember {
	room_id: string;
	user_id: string;
	rooms: MockRoom & {
		last_message?: {
			content: string;
			created_at: string;
			sender_id: string;
		};
	};
}

/** Находит последнее сообщение в комнате */
export const getLastMessage = (roomId: string) => {
	const roomMessages = mockMessages
		.filter((m) => m.room_id === roomId)
		.sort(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		);
	return roomMessages.length > 0 ? roomMessages[0] : undefined;
};

/** Генерирует связи пользователя с комнатами */
export const getMockRoomMembers = (userId: string): MockRoomMember[] => {
	return MOCK_ROOMS.map((room) => ({
		room_id: room.id,
		user_id: userId,
		rooms: {
			...room,
			last_message: getLastMessage(room.id),
		},
	}));
};

export const MOCK_GROUP_AVATARS = [
	"https://api.dicebear.com/7.x/avataaars/svg?seed=group1",
	"https://api.dicebear.com/7.x/avataaars/svg?seed=group2",
	"https://api.dicebear.com/7.x/avataaars/svg?seed=group3",
];
