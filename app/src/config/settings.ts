import {
    Bell,
    Database,
    LayoutDashboard,
    Lock,
    Megaphone,
    Palette,
    Shield,
    ShieldCheck,
    User,
    Users,
} from "lucide-react";
import { COMPONENT_INTENT, ROUTES } from "@/lib/constants";
import type { ComponentIntent } from "@/lib/types/ui";

export interface SettingsItemConfig {
    key: string;
    path: string;
    icon: React.ElementType;
    labelKey: string;
    defaultLabel: string;
    intent: ComponentIntent;
    adminOnly?: boolean;
}

export const SETTINGS_ITEMS: SettingsItemConfig[] = [
    {
        key: "profile",
        path: ROUTES.SETTINGS_PROFILE,
        icon: User,
        labelKey: "settings.profile.profile",
        defaultLabel: "Профиль",
        intent: COMPONENT_INTENT.SECONDARY,
    },
    {
        key: "account",
        icon: ShieldCheck,
        labelKey: "settings.account.account",
        defaultLabel: "Аккаунт",
        path: ROUTES.SETTINGS_ACCOUNT,
        intent: COMPONENT_INTENT.INFO,
    },
    {
        key: "appearance",
        icon: Palette,
        labelKey: "settings.appearance.appearance",
        defaultLabel: "Внешний вид",
        path: ROUTES.SETTINGS_APPEARANCE,
        intent: COMPONENT_INTENT.PRIMARY,
    },
    {
        key: "privacy",
        icon: Lock,
        labelKey: "settings.privacy.privacy",
        defaultLabel: "Конфиденциальность",
        path: ROUTES.SETTINGS_PRIVACY,
        intent: COMPONENT_INTENT.SUCCESS,
    },
    {
        key: "notifications",
        icon: Bell,
        labelKey: "settings.notifications.notifications",
        defaultLabel: "Уведомления",
        path: ROUTES.SETTINGS_NOTIFICATIONS,
        intent: COMPONENT_INTENT.WARNING,
    },
    {
        key: "security",
        icon: Shield,
        labelKey: "settings.security.security",
        defaultLabel: "Безопасность",
        path: ROUTES.SETTINGS_SECURITY,
        intent: COMPONENT_INTENT.ERROR,
    },
    {
        key: "storage",
        icon: Database,
        labelKey: "settings.storage.storage",
        defaultLabel: "Хранилище и данные",
        path: ROUTES.SETTINGS_STORAGE,
        intent: COMPONENT_INTENT.INFO,
    },
];

export const ADMIN_ITEMS: SettingsItemConfig[] = [
    {
        key: "dashboard",
        path: ROUTES.ADMIN,
        icon: LayoutDashboard,
        labelKey: "admin.menu.dashboard",
        defaultLabel: "Панель управления",
        intent: COMPONENT_INTENT.PRIMARY,
    },
    {
        key: "users",
        path: ROUTES.ADMIN_USERS,
        icon: Users,
        labelKey: "admin.menu.users",
        defaultLabel: "Пользователи",
        intent: COMPONENT_INTENT.SUCCESS,
    },
    {
        key: "broadcast",
        path: ROUTES.ADMIN_BROADCAST,
        icon: Megaphone,
        labelKey: "admin.menu.broadcast",
        defaultLabel: "Рассылка",
        intent: COMPONENT_INTENT.WARNING,
    },
];
