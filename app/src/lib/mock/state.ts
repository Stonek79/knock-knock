import { MOCK_ROOMS, MOCK_USERS, mockMessages } from "./data";

// Session storage helpers for state
export const getStoredMockState = () => {
	try {
		const saved = localStorage.getItem("mock_db_state");
		if (!saved) return null;
		return JSON.parse(saved);
	} catch {
		return null;
	}
};

// biome-ignore lint/suspicious/noExplicitAny: Mocking internal state
export const saveMockState = (state: any) => {
	try {
		localStorage.setItem("mock_db_state", JSON.stringify(state));
	} catch (e) {
		console.error("Failed to save mock state", e);
	}
};

const initialState = getStoredMockState() || {
	rooms: [...MOCK_ROOMS],
	members: MOCK_ROOMS.flatMap((room) =>
		MOCK_USERS.map((user) => ({
			room_id: room.id,
			user_id: user.id,
			last_read_at: new Date(0).toISOString(),
		})),
	),
	messages: [...mockMessages],
};

export const MOCK_STATE = initialState;
