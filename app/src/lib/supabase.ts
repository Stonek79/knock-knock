import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// --- MOCK DATA SYSTEM ---

interface MockUser {
    id: string;
    email: string;
    username: string;
    display_name: string;
}

interface MockRoom {
    id: string;
    name: string;
    created_at: string;
}

interface MockMessage {
    id: string;
    room_id: string;
    sender_id: string;
    content: string;
    created_at: string;
}

const MOCK_USERS: MockUser[] = [
    {
        id: 'user-1',
        email: 'alex@example.com',
        username: 'Alex Stone',
        display_name: 'Alex',
    },
    {
        id: 'user-2',
        email: 'elon@spacex.com',
        username: 'Elon Musk',
        display_name: 'Elon',
    },
    {
        id: 'user-3',
        email: 'pavel@telegram.org',
        username: 'Pavel Durov',
        display_name: 'Pavel',
    },
];

const MOCK_ROOMS: MockRoom[] = [
    { id: 'room-1', name: 'General', created_at: new Date().toISOString() },
    { id: 'room-2', name: 'Dev Talk', created_at: new Date().toISOString() },
];

const mockMessages: MockMessage[] = [
    {
        id: 'msg-1',
        room_id: 'room-1',
        sender_id: 'user-2',
        content: 'To the Mars! 🚀',
        created_at: new Date().toISOString(),
    },
    {
        id: 'msg-2',
        room_id: 'room-1',
        sender_id: 'user-3',
        content: 'Privacy first.',
        created_at: new Date().toISOString(),
    },
];

// Session state (stored in session storage to survive reloads)
const getStoredSession = () => {
    const saved = sessionStorage.getItem('mock_session');
    return saved ? JSON.parse(saved) : null;
};

let mockSession: {
    user: MockUser;
    access_token: string;
    expires_at: number;
} | null = getStoredSession();

const saveSession = (
    session: {
        user: MockUser;
        access_token: string;
        expires_at: number;
    } | null,
) => {
    mockSession = session;
    if (session) {
        sessionStorage.setItem('mock_session', JSON.stringify(session));
    } else {
        sessionStorage.removeItem('mock_session');
    }
};

// --- MOCK CLIENT IMPLEMENTATION ---

const mockSupabase = {
    auth: {
        getSession: () =>
            Promise.resolve({ data: { session: mockSession }, error: null }),
        getUser: () =>
            Promise.resolve({
                data: { user: mockSession?.user || null },
                error: null,
            }),
        onAuthStateChange: (
            callback: (event: string, session: unknown) => void,
        ) => {
            setTimeout(
                () =>
                    callback(
                        mockSession ? 'SIGNED_IN' : 'SIGNED_OUT',
                        mockSession,
                    ),
                0,
            );
            return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signInWithOtp: ({ email }: { email: string }) => {
            const user = MOCK_USERS.find((u) => u.email === email) || {
                id: 'dev-user',
                email,
                username: 'New User',
                display_name: 'User',
            };
            saveSession({
                user,
                access_token: 'mock-token',
                expires_at: 9999999999,
            });
            setTimeout(() => window.location.reload(), 500);
            return Promise.resolve({ data: {}, error: null });
        },
        signOut: () => {
            saveSession(null);
            setTimeout(() => window.location.reload(), 500);
            return Promise.resolve({ error: null });
        },
    },
    from: (table: string) => {
        return {
            select: (_columns?: string) => ({
                eq: (column: string, value: string) => ({
                    single: () => {
                        if (table === 'profiles') {
                            const user =
                                MOCK_USERS.find((u) => u.id === value) ||
                                mockSession?.user;
                            return Promise.resolve({ data: user, error: null });
                        }
                        return Promise.resolve({ data: null, error: null });
                    },
                    order: (_col: string, _options: { ascending: boolean }) => {
                        if (table === 'messages' && column === 'room_id') {
                            const filtered = mockMessages.filter(
                                (m) => m.room_id === value,
                            );
                            return Promise.resolve({
                                data: filtered,
                                error: null,
                            });
                        }
                        return Promise.resolve({ data: [], error: null });
                    },
                }),
                order: (_col: string, _options: { ascending: boolean }) => {
                    if (table === 'rooms')
                        return Promise.resolve({
                            data: MOCK_ROOMS,
                            error: null,
                        });
                    if (table === 'messages')
                        return Promise.resolve({
                            data: mockMessages,
                            error: null,
                        });
                    return Promise.resolve({ data: [], error: null });
                },
            }),
            insert: (data: unknown) => {
                if (table === 'messages') {
                    const newMsg = {
                        id: `msg-${Date.now()}`,
                        ...(data as object),
                        created_at: new Date().toISOString(),
                    } as MockMessage;
                    mockMessages.push(newMsg);
                    return Promise.resolve({ data: [newMsg], error: null });
                }
                return Promise.resolve({ data: [], error: null });
            },
            upsert: (data: unknown) => Promise.resolve({ data, error: null }),
        };
    },
    channel: (name: string) => ({
        on: (_type: string, _filter: unknown, _callback: unknown) => {
            return {
                subscribe: () => {
                    console.log(`[Mock] Subscribed to channel: ${name}`);
                },
            };
        },
    }),
} as unknown as SupabaseClient;

/**
 * Глобальный клиент Supabase.
 * Если VITE_USE_MOCK=true или настройки отсутствуют, используется Mock-клиент.
 */
export const supabase =
    useMock || !isSupabaseConfigured
        ? mockSupabase
        : createClient(supabaseUrl, supabaseAnonKey);
