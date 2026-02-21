import {
	MOCK_ROOMS,
	MOCK_USERS,
	type MockMessage,
	type MockRoom,
	mockMessages,
} from "./data";

export interface MockMember {
	room_id: string;
	user_id: string;
	last_read_at: string;
	role?: string;
	joined_at?: string;
}

export interface MockState {
	rooms: MockRoom[];
	members: MockMember[];
	messages: MockMessage[];
}

// Session storage helpers for state
export const getStoredMockState = (): MockState | null => {
	try {
		const saved = localStorage.getItem("mock_db_state");
		if (!saved) return null;
		return JSON.parse(saved) as MockState;
	} catch {
		return null;
	}
};

export const saveMockState = (state: MockState) => {
	try {
		localStorage.setItem("mock_db_state", JSON.stringify(state));
	} catch (e) {
		console.error("Failed to save mock state", e);
	}
};

const defaultMembers: MockMember[] = MOCK_ROOMS.flatMap((room) =>
	MOCK_USERS.map((user) => ({
		room_id: room.id,
		user_id: user.id,
		last_read_at: new Date(0).toISOString(),
		role: "user",
		joined_at: new Date().toISOString(),
	})),
);

// Если нет сохраненного состояния, используем дефолтное
// Но важно чтобы оно соответствовало интерфейсу
const initialState: MockState = getStoredMockState() || {
	rooms: [...MOCK_ROOMS],
	members: defaultMembers,
	messages: [...mockMessages],
};

export const MOCK_STATE = initialState;
