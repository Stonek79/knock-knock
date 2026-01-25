import type { SupabaseClient } from "@supabase/supabase-js";
import {
	getMockRoomMembers,
	MOCK_ROOMS,
	MOCK_USERS,
	type MockUser,
	mockMessages,
} from "./data";

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
			signOut: () => {
				saveSession(null);
				return Promise.resolve({ error: null });
			},
		},
		channel: (_name: string) => ({
			on: () => ({
				subscribe: () => ({
					unsubscribe: () => undefined,
				}),
			}),
			subscribe: () => ({
				unsubscribe: () => undefined,
			}),
		}),
		removeChannel: (_channel: any) => undefined,
	} as unknown as SupabaseClient;
};

// Более точная реализация `from` для поддержки цепочек и await
const mockFrom = (table: string) => {
	// Состояние текущего запроса
	const state = {
		filters: [] as { column: string; value: unknown }[],
		order: undefined as { column: string; options?: any } | undefined,
		single: false as boolean,
		limit: undefined as number | undefined,
	};

	// Функция выполнения запроса
	const execute = async () => {
		await new Promise((resolve) => setTimeout(resolve, 50)); // Эмуляция сети

		// biome-ignore lint/suspicious/noExplicitAny: Mock data can be anything
		let data: any[] | any = [];

		// 1. Выбор источника данных
		if (table === "room_members") {
			// Специальный случай: фильтр по user_id возвращает список комнат пользователя
			const userIdFilter = state.filters.find((f) => f.column === "user_id");
			if (userIdFilter) {
				data = getMockRoomMembers(userIdFilter.value as string);
			} else {
				data = [];
			}
		} else if (table === "profiles") {
			data = MOCK_USERS;
		} else if (table === "rooms") {
			data = MOCK_ROOMS;
		} else if (table === "room_keys") {
			// Мокаем ключи шифрования
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
		} else if (table === "messages") {
			data = mockMessages;
		}

		// 2. Применение фильтров
		if (Array.isArray(data)) {
			// Фильтруем данные
			for (const filter of state.filters) {
				// Пропускаем user_id для room_members, т.к. он уже обработан на этапе выборки
				if (table === "room_members" && filter.column === "user_id") continue;

				data = data.filter((item: any) => {
					const itemValue = item[filter.column];
					const filterValue = filter.value;

					if (Array.isArray(filterValue)) {
						return filterValue.includes(itemValue);
					}
					return itemValue === filterValue;
				});
			}

			// 3. Сортировка
			if (state.order) {
				data.sort((a: any, b: any) => {
					const valA = a[state.order!.column];
					const valB = b[state.order!.column];
					// Простое сравнение строк/дат
					if (valA < valB) return state.order!.options?.ascending ? -1 : 1;
					if (valA > valB) return state.order!.options?.ascending ? 1 : -1;
					return 0;
				});
			}

			// 4. Лимит
			if (state.limit !== undefined) {
				data = data.slice(0, state.limit);
			}
		} else if (data && !Array.isArray(data)) {
			// Если источник не массив (вдруг), оборачиваем
			data = [data];
		}

		// 5. Single response
		if (state.single) {
			if (Array.isArray(data) && data.length > 0) {
				return { data: data[0], error: null };
			}
			return {
				data: null,
				error: { message: "Not found", code: "PGRST116" },
			};
		}

		return { data, error: null };
	};

	// Строитель (Builder)
	// biome-ignore lint/suspicious/noExplicitAny: Mock builder requires flexible types
	const builder: any = {
		select: (_columns?: string) => builder,
		eq: (column: string, value: unknown) => {
			state.filters.push({ column, value });
			return builder;
		},
		in: (column: string, values: unknown[]) => {
			// Mock 'in' filter: match any of the values
			state.filters.push({ column, value: values });
			return builder;
		},
		order: (column: string, options?: { ascending?: boolean }) => {
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
			const result = await execute();
			if (result.error && (result.error as any).code === "PGRST116") {
				return { data: null, error: null };
			}
			return result;
		},
		insert: (values: unknown) => {
			// Mock insert - just return success
			return Promise.resolve({ data: values, error: null });
		},
		update: (_values: unknown) => {
			// Mock update - returns builder to allow chains or await
			return builder;
		},
		delete: () => {
			// Mock delete - returns builder to allow .eq()...
			return builder;
		},
		// Позволяет использовать await builder
		// biome-ignore lint/suspicious/noThenProperty: Necessary to mock Supabase's Thenable interface
		then: (
			onfulfilled?: (value: any) => any,
			onrejected?: (reason: any) => any,
		) => {
			// biome-ignore lint/suspicious/noThenProperty: Necessary to mock Supabase's Thenable interface
			return execute().then(onfulfilled, onrejected);
		},
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
