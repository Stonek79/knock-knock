import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PinScreen } from "@/features/auth/PinScreen";
import { CallsList } from "@/features/calls/CallsList";
import { ChatList } from "@/features/chat/ChatList";
import { ContactList } from "@/features/contacts/ContactList";

import { SettingsSidebar } from "@/features/settings/SettingsSidebar";
import { useKeySync } from "@/hooks/useKeySync";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { BottomNav } from "@/layouts/BottomNav";
import { DesktopLayout } from "@/layouts/DesktopLayout";
import { MobileHeader } from "@/layouts/MobileHeader";
import { IS_DEV, ROUTES } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useGhostStore } from "@/stores/ghost";
import styles from "./root.module.css";

/**
 * Корневой компонент приложения (Root Layout).
 *
 * Отвечает за:
 * 1. Инициализацию сессии пользователя (auth check).
 * 2. Синхронизацию ключей шифрования (P2P).
 * 3. Определение текущего layout'а (Mobile vs Desktop).
 * 4. Роутинг боковой панели (Sidebar) для десктопа.
 * 5. Глобальные элементы (DevTools, Modals, Toasts).
 *
 * @returns {JSX.Element} Обертка приложения с навигацией и контентом.
 */
export function RootLayout() {
    const { t } = useTranslation();
    const { initialize, loading, user } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);
    const ghostStatus = useGhostStore((s) => s.status);
    const ghostEnabled = useGhostStore((s) => s.enabled);

    // Автоматическая генерация и синхронизация ключей P2P (End-to-End Encryption)
    useKeySync();

    /**
     * Эффект инициализации авторизации.
     * Проверяет наличие сессии при монтировании.
     */
    useEffect(() => {
        initialize();
    }, [initialize]);

    /**
     * Флаг, определяющий необходимость скрытия навигации (Sidebar/BottomNav).
     *
     * Скрываем навигацию если:
     * - Мы на странице логина.
     * - Мы на лендинге.
     * - Мы внутри конкретного чата на мобильном устройстве (Full Screen Chat).
     * - Мы на странице "Избранное" на мобильном (ChatRoom имеет свой RoomHeader).
     */
    const hideNav =
        location.pathname === ROUTES.LOGIN ||
        location.pathname === ROUTES.HOME ||
        (isMobile &&
            (location.pathname.match(
                new RegExp(`^${ROUTES.CHAT_LIST}/[^/]+$`),
            ) || // /chat/:roomId
                location.pathname.startsWith(ROUTES.FAVORITES))); // /favorites

    /**
     * Вычисляет содержимое боковой панели (Sidebar) для Desktop Layout.
     * В зависимости от текущего маршрута рендерит соответствующий список.
     *
     * Логика:
     * - /chat -> Список чатов
     * - /private -> Выбор контакта для нового чата
     * - /contacts -> Список контактов
     * - /calls -> История звонков
     * - /favorites -> Избранное
     * - /settings -> Меню настроек
     *
     * @returns {ReactNode} Компонент для отображения в сайдбаре.
     */
    const sidebarContent = useMemo(() => {
        const path = location.pathname;

        // Чаты или Избранное — показываем список чатов
        if (
            path.startsWith(ROUTES.CHAT_LIST) ||
            path.startsWith(ROUTES.FAVORITES)
        ) {
            return <ChatList />;
        }

        // Приватный чат — показываем список контактов для выбора собеседника
        if (path.startsWith(ROUTES.PRIVATE)) {
            return (
                <ContactList
                    mode="select"
                    onSelect={(contact) => {
                        // Переходим на DMInitializer для создания/поиска DM (с флагом приватности)
                        navigate({
                            to: "/dm/$userId",
                            params: { userId: contact.id },
                            search: { isPrivate: true },
                        });
                    }}
                />
            );
        }

        // Контакты — основной список контактов, клик открывает чат
        if (path.startsWith(ROUTES.CONTACTS)) {
            return (
                <ContactList
                    mode="list"
                    onSelect={(contact) => {
                        // Переходим на DMInitializer для поиска/создания DM
                        navigate({
                            to: "/dm/$userId",
                            params: { userId: contact.id },
                        });
                    }}
                />
            );
        }

        // Звонки
        if (path.startsWith(ROUTES.CALLS)) {
            return <CallsList />;
        }

        // Настройки
        if (path.startsWith(ROUTES.SETTINGS) || path.startsWith(ROUTES.ADMIN)) {
            return <SettingsSidebar />;
        }

        return null; // По умолчанию ничего (или fallback)
    }, [location.pathname, navigate]);

    /**
     * Баннер режима разработчика.
     * Показывается если Supabase не сконфигурирован (Mock Mode).
     */
    const devModeBanner = !isSupabaseConfigured ? (
        <div className={styles.banner}>
            ⚠️ Dev Mode: Using Mock Backend (No persistence)
        </div>
    ) : null;

    // Скрин лоадера во время проверки авторизации
    if (loading) {
        return <div className={styles.loading}>{t("common.loading")}</div>;
    }

    // PIN-экран Ghost Mode (рендерится поверх всего)
    if (ghostEnabled && ghostStatus === "locked") {
        return <PinScreen />;
    }

    // Рендер для неавторизованных пользователей или "чистых" экранов (Login, Home)
    if (!user || hideNav) {
        return (
            <div className={styles.layout}>
                {devModeBanner}
                <Outlet />
                {IS_DEV && <TanStackRouterDevtools position="bottom-right" />}
            </div>
        );
    }

    // === MOBILE LAYOUT ===
    // Вертикальный стек: Header -> Content -> BottomNav
    if (isMobile) {
        return (
            <div className={`${styles.layout} ${styles.mobileLayout}`}>
                {devModeBanner}
                <MobileHeader />
                <Outlet />
                <BottomNav />
                {IS_DEV && <TanStackRouterDevtools position="bottom-right" />}
            </div>
        );
    }

    // === DESKTOP LAYOUT ===
    // Двухколоночный Grid: Sidebar (слева) + Content (справа)
    return (
        <DesktopLayout sidebarContent={sidebarContent}>
            {devModeBanner}
            <Outlet />
            {IS_DEV && <TanStackRouterDevtools position="bottom-right" />}
        </DesktopLayout>
    );
}
