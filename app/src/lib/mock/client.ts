import type { SupabaseClient } from "@supabase/supabase-js";
import { MOCK_USERS, type MockUser } from "./data";
import { handleRoomKeysQuery } from "./queries/keys";
import { handleMessagesQuery } from "./queries/messages";
import { handleProfilesQuery } from "./queries/profiles";
import { handleRoomMembersQuery } from "./queries/roomMembers";
import { handleRoomsQuery } from "./queries/rooms";
import type { QueryState } from "./queries/types";
import { mockEE } from "./realtime";
import { handleRpc } from "./rpc";
import { MOCK_STATE } from "./state";

// Session storage helper
const getStoredSession = () => {
	try {
		const saved = localStorage.getItem("mock_session");
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
		localStorage.setItem("mock_session", JSON.stringify(session));
		notifyAuthListeners("SIGNED_IN", {
			user: session.user,
			access_token: session.access_token,
		});
	} else {
		localStorage.removeItem("mock_session");
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
		// biome-ignore lint/suspicious/noExplicitAny: Mocking RPC
		rpc: (fn: string, args: any) => {
			const userId = mockSession?.user.id;
			const { data, error } = handleRpc(fn, args, MOCK_STATE, userId, (e, p) =>
				mockEE.emit(e, p),
			);
			return Promise.resolve({ data, error });
		},
	} as unknown as SupabaseClient;
};

// Более точная реализация `from` для поддержки цепочек и await
const mockFrom = (table: string) => {
	const state: QueryState = {
		operation: "select",
		filters: [],
		order: undefined,
		single: false,
		limit: undefined,
	};

	const execute = async () => {
		await new Promise((resolve) => setTimeout(resolve, 50));

		switch (table) {
			case "profiles":
				return handleProfilesQuery(state);
			case "rooms":
				return handleRoomsQuery(state);
			case "messages":
				return handleMessagesQuery(state);
			case "room_members":
				return handleRoomMembersQuery(state);
			case "room_keys":
				return handleRoomKeysQuery(state);
			default:
				console.warn(`Mock table ${table} not implemented`);
				return { data: [], error: null };
		}
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
			state.operation = "insert";
			state.updateValues = values;

			// Возвращаем builder (как в оригинале) который резолвится сразу, но с эмуляцией select().single()
			// В оригинале insert сразу делал push, тут мы отложили до execute, но wait.
			// Supabase client: .insert().select().single() -> execute THEN
			// Нам нужно чтобы execute вызвался.
			// В оригинале insert СРАЗУ менял стейт.
			// Перенесем логику: insert просто меняет state, a then/execute выполняет.

			// НО! В оригинале insert(...) СРАЗУ добавлял в MOCK_STATE (строки 509-512 old client.ts),
			// а потом возвращал объект с .select()...
			// Если сохранить ленивость, то нам достаточно просто вернуть builder.
			// Если вызовут await .insert(), сработает .then() -> execute().
			// Если вызовут .insert().select(), сработает .select() -> builder -> await -> execute().

			return builder;
		},
		// biome-ignore lint/suspicious/noExplicitAny: Mocking internal user data
		update: (values: any) => {
			state.operation = "update";
			state.updateValues = values;
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
		storage: {
			from: (bucket: string) => ({
				// biome-ignore lint/suspicious/noExplicitAny: Mocking internal client
				upload: async (path: string, _file: any, _options: any) => {
					return { data: { path }, error: null };
				},
				getPublicUrl: (path: string) => {
					// Возвращаем фейковый URL
					const base =
						typeof window !== "undefined"
							? window.location.origin
							: "http://localhost:3000";
					return {
						data: { publicUrl: `${base}/mock-storage/${bucket}/${path}` },
					};
				},
			}),
		},
	} as unknown as SupabaseClient;
};
