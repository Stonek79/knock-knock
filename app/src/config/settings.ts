import {
    Bell,
    Database,
    Lock,
    Palette,
    Shield,
    ShieldCheck,
    User,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";

export interface SettingsItemConfig {
    key: string;
    path: string;
    icon: React.ElementType;
    labelKey: string;
    defaultLabel: string;
    color: string;
}

export const SETTINGS_ITEMS: SettingsItemConfig[] = [
    {
        key: "profile",
        path: ROUTES.SETTINGS_PROFILE,
        icon: User,
        labelKey: "settings.profile.profile",
        defaultLabel: "Профиль",
        color: "grey",
    },
    {
        key: "account",
        icon: ShieldCheck,
        labelKey: "settings.account.account",
        defaultLabel: "Аккаунт",
        path: ROUTES.SETTINGS_ACCOUNT,
        color: "blue",
    },
    {
        key: "appearance",
        icon: Palette,
        labelKey: "settings.appearance.appearance",
        defaultLabel: "Внешний вид",
        path: ROUTES.SETTINGS_APPEARANCE,
        color: "violet",
    },
    {
        key: "privacy",
        icon: Lock,
        labelKey: "settings.privacy.privacy",
        defaultLabel: "Конфиденциальность",
        path: ROUTES.SETTINGS_PRIVACY,
        color: "green",
    },
    {
        key: "notifications",
        icon: Bell,
        labelKey: "settings.notifications.notifications",
        defaultLabel: "Уведомления",
        path: ROUTES.SETTINGS_NOTIFICATIONS,
        color: "orange",
    },
    {
        key: "security",
        icon: Shield,
        labelKey: "settings.security.security",
        defaultLabel: "Безопасность",
        path: ROUTES.SETTINGS_SECURITY,
        color: "red",
    },
    {
        key: "storage",
        icon: Database,
        labelKey: "settings.storage.storage",
        defaultLabel: "Хранилище и данные",
        path: ROUTES.SETTINGS_STORAGE,
        color: "aqua",
    },
];
