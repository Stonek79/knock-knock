import { Navigate } from "@tanstack/react-router";
import { SettingsMenu } from "@/features/settings/SettingsMenu";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { ROUTES } from "@/lib/constants";

export function SettingsIndexPage() {
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    // На десктопе редирект на первый раздел настроек
    if (!isMobile) {
        return <Navigate to={ROUTES.SETTINGS_ACCOUNT} />;
    }

    // На мобильной показываем меню настроек
    return <SettingsMenu />;
}
