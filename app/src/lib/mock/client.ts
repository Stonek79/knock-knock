import type { SupabaseClient } from "@supabase/supabase-js";
import { MOCK_ROOMS, MOCK_USERS, type MockUser, mockMessages } from "./data";

// Session storage helper
const getStoredSession = () => {
	try {
		const saved = sessionStorage.getItem("mock_session");
		return saved ? JSON.parse(saved) : null;
	} catch {
		return null;
	}
};

interface MockSession {
	user: MockUser;
	access_token: string;
	expires_at: number;
}

// Global mock state (in-memory, preserved across HMR if module is not disposed)
let mockSession: MockSession | null = getStoredSession();

// Auth subscription listeners
const authListeners = new Set<(event: string, session: unknown) => void>();

const notifyAuthListeners = (event: string, session: unknown) => {
	authListeners.forEach((callback) => {
		try {
			callback(event, session);
		} catch (e) {
			console.error("Error in auth listener:", e);
		}
	});
};

const saveSession = (session: MockSession | null) => {
	mockSession = session;
	if (session) {
		sessionStorage.setItem("mock_session", JSON.stringify(session));
		notifyAuthListeners("SIGNED_IN", {
			user: session.user,
			access_token: session.access_token,
		});
	} else {
		sessionStorage.removeItem("mock_session");
		notifyAuthListeners("SIGNED_OUT", null);
	}
};

/**
 * Создает моковый клиент Supabase.
 * Реализует только необходимые методы для работы UI.
 */
export const createMockClient = (): SupabaseClient => {
	return {
		auth: {
			getSession: () =>
				Promise.resolve({
					// biome-ignore lint/suspicious/noExplicitAny: Mocking internal session data
					data: { session: mockSession as any },
					error: null,
				}),
			getUser: () =>
				Promise.resolve({
					// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
					data: { user: (mockSession?.user as any) || null },
					error: null,
				}),
			onAuthStateChange: (
				callback: (event: string, session: unknown) => void,
			) => {
				// Регистрируем слушателя
				authListeners.add(callback);

				// Сразу вызываем с текущим состоянием
				setTimeout(() => {
					callback(mockSession ? "SIGNED_IN" : "SIGNED_OUT", mockSession);
				}, 0);

				return {
					data: {
						subscription: {
							unsubscribe: () => {
								authListeners.delete(callback);
							},
						},
					},
				};
			},
			signInWithOtp: ({ email }: { email: string }) => {
				const user = MOCK_USERS.find((u) => u.email === email) || {
					id: "dev-user",
					email,
					username: "New User",
					display_name: "User",
				};

				const newSession = {
					user,
					access_token: "mock-token",
					expires_at: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hours
				};

				saveSession(newSession);
				return Promise.resolve({ data: {}, error: null });
			},
			signInWithPassword: ({ email }: { email: string; password?: string }) => {
				// Mock: Allow any password, just find user by email
				const user = MOCK_USERS.find((u) => u.email === email);

				if (!user) {
					return Promise.resolve({
						data: { user: null, session: null },
						error: {
							message: "Invalid login credentials",
							name: "AuthError",
							status: 400,
							// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
						} as any,
					});
				}

				const newSession = {
					user,
					access_token: "mock-token",
					expires_at: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hours
				};

				saveSession(newSession);
				return Promise.resolve({
					data: { user, session: newSession },
					error: null,
				});
			},
			signOut: () => {
				saveSession(null);
				return Promise.resolve({ error: null });
			},
		},
		channel: () => {
			// biome-ignore lint/complexity/noBannedTypes: Mocking internal user data
			const listeners: { event: string; filter: string; callback: Function }[] =
				[];

			const builder = {
				// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
				// biome-ignore lint/complexity/noBannedTypes: Mocking internal user data
				on: (type: string, filterObj: any, callback: Function) => {
					// Формируем ключ события: postgres_changes:public:MESSAGES:room_id=eq.ID
					const eventKey = `${type}:public:${filterObj.table}:${filterObj.filter}`;
					listeners.push({
						event: eventKey,
						filter: filterObj.filter,
						callback,
					});
					return builder;
				},
				subscribe: () => {
					const unsubscribers = listeners.map((l) =>
						mockEE.on(l.event, l.callback),
					);
					return {
						unsubscribe: () => {
							unsubscribers.forEach((unsub) => {
								unsub();
							});
						},
					};
				},
				unsubscribe: () => undefined,
			};
			return builder;
		},
		// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
		removeChannel: (_channel: any) => undefined,
	} as unknown as SupabaseClient;
};

// Session storage helpers for state
const getStoredMockState = () => {
	try {
		const saved = sessionStorage.getItem("mock_db_state");
		if (!saved) return null;
		return JSON.parse(saved);
	} catch {
		return null;
	}
};

// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
const saveMockState = (state: any) => {
	try {
		sessionStorage.setItem("mock_db_state", JSON.stringify(state));
	} catch (e) {
		console.error("Failed to save mock state", e);
	}
};

const initialState = getStoredMockState() || {
	rooms: [...MOCK_ROOMS],
	members: MOCK_ROOMS.flatMap((room) =>
		MOCK_USERS.map((user) => ({ room_id: room.id, user_id: user.id })),
	),
	messages: [...mockMessages],
};

const MOCK_STATE = initialState;

// Простая реализация EventEmitter для имитации Realtime
class MockEventEmitter {
	// biome-ignore lint/complexity/noBannedTypes: Mocking internal user data
	private listeners: Record<string, Function[]> = {};

	// biome-ignore lint/complexity/noBannedTypes: Mocking internal user data
	on(event: string, callback: Function) {
		if (!this.listeners[event]) this.listeners[event] = [];
		this.listeners[event].push(callback);
		return () => {
			this.listeners[event] = this.listeners[event].filter(
				(l) => l !== callback,
			);
		};
	}

	// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
	emit(event: string, payload: any) {
		if (this.listeners[event]) {
			this.listeners[event].forEach((l) => {
				l(payload);
			});
		}
	}
}

const mockEE = new MockEventEmitter();

// Более точная реализация `from` для поддержки цепочек и await
const mockFrom = (table: string) => {
	const state = {
		operation: "select",
		filters: [] as { column: string; value: unknown }[],
		// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
		order: undefined as { column: string; options?: any } | undefined,
		single: false as boolean,
		limit: undefined as number | undefined,
	};
	// ... (skip lines)

	const execute = async () => {
		await new Promise((resolve) => setTimeout(resolve, 50));
		// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
		let data: any[] | any = [];

		if (table === "room_members") {
			const userIdFilter = state.filters.find((f) => f.column === "user_id");
			if (userIdFilter) {
				// Ищем комнаты пользователя
				const userMembers = MOCK_STATE.members.filter(
					// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
					(m: any) => m.user_id === userIdFilter.value,
				);
				// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
				data = userMembers.map((m: any) => {
					// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
					const room = MOCK_STATE.rooms.find((r: any) => r.id === m.room_id);
					// Находим последнее сообщение
					const lastMsg = MOCK_STATE.messages
						// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
						.filter((msg: any) => msg.room_id === m.room_id)
						.sort(
							// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
							(a: any, b: any) =>
								new Date(b.created_at).getTime() -
								new Date(a.created_at).getTime(),
						)[0];

					// Находим всех участников этой комнаты с профилями
					const allMembers = MOCK_STATE.members
						// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
						.filter((rm: any) => rm.room_id === m.room_id)
						// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
						.map((rm: any) => ({
							user_id: rm.user_id,
							profiles: MOCK_USERS.find((u) => u.id === rm.user_id) || null,
						}));

					return {
						room_id: m.room_id,
						user_id: m.user_id,
						rooms: room
							? {
									...room,
									last_message: lastMsg
										? {
												content: lastMsg.content,
												created_at: lastMsg.created_at,
												sender_id: lastMsg.sender_id,
											}
										: null,
									room_members: allMembers,
								}
							: null,
					};
				});
			} else {
				// Общий случай для room_members (без фильтра по user_id в начале)
				// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
				data = MOCK_STATE.members.map((m: any) => ({
					...m,
					profiles: MOCK_USERS.find((u) => u.id === m.user_id) || null,
				}));
			}
		} else if (table === "profiles") {
			data = MOCK_USERS;
		} else if (table === "rooms") {
			// Всегда джойним room_members для комнат, так как этого ожидает useChatRoomData
			// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
			data = MOCK_STATE.rooms.map((room: any) => {
				const members = MOCK_STATE.members
					// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
					.filter((m: any) => m.room_id === room.id)
					// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
					.map((m: any) => ({
						...m,
						profiles:
							MOCK_USERS.find((u) => u.id === m.user_id) ||
							(mockSession && mockSession.user.id === m.user_id
								? mockSession.user
								: null),
					}));
				return { ...room, room_members: members };
			});
		} else if (table === "messages") {
			// При запросе сообщений добавляем профили отправителей
			// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
			data = MOCK_STATE.messages.map((msg: any) => ({
				...msg,
				profiles: MOCK_USERS.find((u) => u.id === msg.sender_id) || null,
			}));
		} else if (table === "room_keys") {
			return {
				data: {
					encrypted_key: JSON.stringify({
						ephemeralPublicKey: "mock",
						iv: "mock",
						ciphertext: "mock",
					}),
				},
				error: null,
			};
		}

		// 3. Update / Delete
		if (Array.isArray(data)) {
			// Filter logic needs to be applied first to find WHO to update/delete
			// Re-use logic for filtering
			// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
			let itemsToProcess = data as any[];

			for (const filter of state.filters) {
				if (
					table === "room_members" &&
					filter.column === "user_id" &&
					state.filters.some((f) => f.column === "user_id")
				) {
					if (
						!state.filters.find((f) => f.column === "user_id" && f === filter)
					) {
						itemsToProcess = itemsToProcess.filter(
							// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
							(item: any) => item.user_id === filter.value,
						);
					}
					continue;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
				itemsToProcess = itemsToProcess.filter((item: any) => {
					if (filter.column.startsWith("rooms.")) {
						const subCol = filter.column.split(".")[1];
						return item.rooms?.[subCol] === filter.value;
					}
					const itemValue = item[filter.column];
					if (Array.isArray(filter.value))
						return filter.value.includes(itemValue);
					return itemValue === filter.value;
				});
			}

			// Если операция DELETE
			if (state.operation === "delete") {
				if (table === "rooms") {
					MOCK_STATE.rooms = MOCK_STATE.rooms.filter(
						// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
						(r: any) => !itemsToProcess.some((del) => del.id === r.id),
					);
				} else if (table === "room_members") {
					MOCK_STATE.members = MOCK_STATE.members.filter(
						// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
						(m: any) =>
							!itemsToProcess.some(
								(del) => del.room_id === m.room_id && del.user_id === m.user_id,
							),
					);
				} else if (table === "messages") {
					MOCK_STATE.messages = MOCK_STATE.messages.filter(
						// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
						(m: any) => !itemsToProcess.some((del) => del.id === m.id),
					);
				}
				saveMockState(MOCK_STATE);
				return { data: null, error: null };
			}

			// Если операция UPDATE
			if (state.operation === "update") {
				// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
				const updates = (state as any).updateValues;

				if (table === "messages") {
					// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
					MOCK_STATE.messages = MOCK_STATE.messages.map((msg: any) => {
						if (itemsToProcess.some((item) => item.id === msg.id)) {
							const updatedMsg = { ...msg, ...updates };

							// Emit Realtime Event
							mockEE.emit(
								`postgres_changes:public:${table}:room_id=eq.${msg.room_id}`,
								{
									eventType: "UPDATE",
									new: {
										...updatedMsg,
										profiles:
											MOCK_USERS.find((u) => u.id === msg.sender_id) || null,
									},
									old: msg,
								},
							);
							return updatedMsg;
						}
						return msg;
					});
				} else if (table === "rooms") {
					// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
					MOCK_STATE.rooms = MOCK_STATE.rooms.map((r: any) =>
						itemsToProcess.some((item) => item.id === r.id)
							? { ...r, ...updates }
							: r,
					);
				}

				saveMockState(MOCK_STATE);
				return { data: null, error: null };
			}

			// If select, just return filtered data
			data = itemsToProcess;
		}

		// 3. Order
		if (Array.isArray(data) && state.order) {
			// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
			data.sort((a: any, b: any) => {
				// biome-ignore lint/style/noNonNullAssertion: Mocking internal user data
				const valA = a[state.order!.column];
				// biome-ignore lint/style/noNonNullAssertion: Mocking internal user data
				const valB = b[state.order!.column];
				// biome-ignore lint/style/noNonNullAssertion: Mocking internal user data
				if (valA < valB) return state.order!.options?.ascending ? -1 : 1;
				// biome-ignore lint/style/noNonNullAssertion: Mocking internal user data
				if (valA > valB) return state.order!.options?.ascending ? 1 : -1;
				return 0;
			});
		}

		// 4. Limit
		if (Array.isArray(data) && state.limit) data = data.slice(0, state.limit);

		if (state.single) {
			return data.length > 0
				? { data: data[0], error: null }
				: { data: null, error: { message: "Not found", code: "PGRST116" } };
		}
		return { data, error: null };
	};

	// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
	const builder: any = {
		select: () => builder,
		eq: (column: string, value: unknown) => {
			state.filters.push({ column, value });
			return builder;
		},
		in: (column: string, values: unknown[]) => {
			state.filters.push({ column, value: values });
			return builder;
		},
		// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
		order: (column: string, options?: any) => {
			state.order = { column, options };
			return builder;
		},
		limit: (count: number) => {
			state.limit = count;
			return builder;
		},
		single: () => {
			state.single = true;
			return execute();
		},
		maybeSingle: async () => {
			state.single = true;
			const r = await execute();
			return r.error?.code === "PGRST116" ? { data: null, error: null } : r;
		},
		// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
		insert: (values: any) => {
			const valArr = Array.isArray(values) ? values : [values];

			// Генерируем ID для сообщений если их нет
			if (table === "messages") {
				valArr.forEach((v) => {
					if (!v.id) v.id = Math.random().toString(36).substring(7);
					if (!v.created_at) v.created_at = new Date().toISOString();
				});
			}

			if (table === "rooms") MOCK_STATE.rooms.push(...valArr);
			if (table === "room_members") MOCK_STATE.members.push(...valArr);
			if (table === "messages") {
				MOCK_STATE.messages.push(...valArr);
				// Эмитим событие для Realtime
				valArr.forEach((msg) => {
					mockEE.emit(
						`postgres_changes:public:${table}:room_id=eq.${msg.room_id}`,
						{
							eventType: "INSERT",
							new: {
								...msg,
								profiles:
									MOCK_USERS.find((u) => u.id === msg.sender_id) || null,
							},
						},
					);
				});
			}
			saveMockState(MOCK_STATE);
			return Promise.resolve({ data: values, error: null });
		},
		// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
		update: (values: any) => {
			state.operation = "update";
			// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
			(state as any).updateValues = values;
			return builder;
		},
		delete: () => {
			state.operation = "delete";
			return builder;
		},
		// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
		// biome-ignore lint/suspicious/noThenProperty: Mocking internal user data
		then: (onf?: any, onr?: any) => execute().then(onf, onr),
	};
	return builder;
};

// Патчим createMockClient чтобы использовать mockFrom
export const createClient = (): SupabaseClient => {
	const mockClient = createMockClient();
	return {
		...mockClient,
		// biome-ignore lint/suspicious/noExplicitAny: Mocking internal client
		from: mockFrom as any,
	} as unknown as SupabaseClient;
};
