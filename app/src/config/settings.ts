import { Bell, Lock, Moon, Shield, User } from 'lucide-react';
import { ROUTES } from '@/lib/constants';

export const SETTINGS_ITEMS = [
    {
        key: 'account',
        icon: User,
        labelKey: 'settings.account',
        defaultLabel: 'Аккаунт',
        path: ROUTES.SETTINGS_ACCOUNT,
        color: 'blue',
    },
    {
        key: 'appearance',
        icon: Moon,
        labelKey: 'settings.appearance',
        defaultLabel: 'Внешний вид',
        path: ROUTES.SETTINGS_APPEARANCE,
        color: 'violet',
    },
    {
        key: 'privacy',
        icon: Lock,
        labelKey: 'settings.privacy',
        defaultLabel: 'Конфиденциальность',
        path: ROUTES.SETTINGS_PRIVACY,
        color: 'green',
    },
    {
        key: 'notifications',
        icon: Bell,
        labelKey: 'settings.notifications',
        defaultLabel: 'Уведомления',
        path: ROUTES.SETTINGS_NOTIFICATIONS,
        color: 'orange',
    },
    {
        key: 'security',
        icon: Shield,
        labelKey: 'settings.security',
        defaultLabel: 'Безопасность',
        path: ROUTES.SETTINGS_SECURITY,
        color: 'red',
    },
];
