import { create } from "zustand";
import { ERROR_CODES } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { authRepository } from "@/lib/repositories/auth.repository";
import { UserMapper } from "@/lib/repositories/mappers/userMapper";
import { AuthService } from "@/lib/services/auth";
import { ChatRealtimeService } from "@/lib/services/chat-realtime";
import type { UserRecord as AuthUser } from "@/lib/types";
import type { Profile } from "@/lib/types/profile";

interface AuthState {
    /** Текущий авторизованный пользователь PocketBase */
    pbUser: AuthUser | null;
    /** Профиль в формате приложения */
    profile: Profile | null;
    loading: boolean;
    isAdmin: boolean;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
    fetchProfile: () => Promise<void>;
}

let isInitialized = false;
let lastFetchAttempt = 0;
const FETCH_RETRY_THROTTLE_MS = 10 * 1000; // 10 секунд между попытками при ошибке

let isProcessingRefresh = false;

export const useAuthStore = create<AuthState>((set, get) => ({
    pbUser: null,
    profile: null,
    loading: true,
    isAdmin: false,

    initialize: async () => {
        try {
            const record = AuthService.getLocalRecord();
            if (AuthService.isValid() && record) {
                const profile = UserMapper.toDomain(record, (rec, file) =>
                    authRepository.getFileUrl(rec, file),
                );
                set({ pbUser: record, profile });
                // Проверяем актуальность сессии при старте
                await get().fetchProfile();
            } else {
                set({ loading: false });
            }

            if (!isInitialized) {
                isInitialized = true;

                AuthService.onChange(async () => {
                    if (isProcessingRefresh) {
                        return;
                    }

                    const currentRecord = AuthService.getLocalRecord();
                    if (AuthService.isValid() && currentRecord) {
                        await get().fetchProfile();
                    } else {
                        set({ pbUser: null, profile: null, loading: false });
                    }
                });
            }
        } catch (error) {
            logger.error("Ошибка инициализации AuthStore:", error);
            set({ loading: false });
        }
    },

    fetchProfile: async () => {
        const now = Date.now();

        if (isProcessingRefresh) {
            return;
        }

        if (now - lastFetchAttempt < FETCH_RETRY_THROTTLE_MS) {
            return;
        }

        isProcessingRefresh = true;
        lastFetchAttempt = now;

        try {
            const result = await AuthService.refreshSession();

            if (result.isOk()) {
                const user = result.value;
                const profile = UserMapper.toDomain(user, (rec, file) =>
                    authRepository.getFileUrl(rec, file),
                );
                set({
                    pbUser: user,
                    profile,
                    loading: false,
                    isAdmin: profile.role === "admin",
                });
            } else {
                const error = result.error;
                // 1. Сетевая ошибка — сохраняем сессию
                if (error.kind === ERROR_CODES.NETWORK_ERROR) {
                    logger.warn("Обновление профиля отложено: сеть недоступна");
                    set({ loading: false });
                    return;
                }
                // 2. Явный 401 — сессия протухла, выходим
                if (error.kind === ERROR_CODES.UNAUTHORIZED) {
                    logger.error("Сессия недействительна (401):", error);
                    get().signOut();
                    set({ loading: false });
                    return;
                }
                // 3. Остальные ошибки (500 и т.д.) — логируем, но не разлогиниваем
                logger.error(
                    "Ошибка при обновлении профиля (серверная/прочая):",
                    error,
                );
                set({ loading: false });
            }
        } catch (error) {
            logger.error("Непредвиденная ошибка при получении профиля:", error);
            set({ loading: false });
        } finally {
            isProcessingRefresh = false;
        }
    },

    signOut: async () => {
        set({ pbUser: null, profile: null });
        ChatRealtimeService.destroy();
    },
}));
