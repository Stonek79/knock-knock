import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { APP_NAME, APP_NAME_RU } from "@/lib/constants";
import type { ComponentSize } from "@/lib/types/ui";
import { useThemeStore } from "@/stores/theme";
import styles from "./AppLogo.module.css";

interface AppLogoProps {
    size?: ComponentSize;
    className?: string;
    updateFavicon?: boolean;
}

export function AppLogo({
    className,
    updateFavicon = false,
    size = "md",
}: AppLogoProps) {
    const { i18n } = useTranslation();
    const mode = useThemeStore((state) => state.mode);
    const isRu = i18n.language.startsWith("ru");

    // Текст логотипа (для alt)
    const logoText = isRu ? APP_NAME_RU : APP_NAME;

    // Выбираем логотип в зависимости от темы
    const logoSrc =
        mode === "light"
            ? "/images/nemo-boat-light.png"
            : "/images/nemo-boat-dark.png";

    // Фавикон используем в виде буквы N
    const faviconSrc =
        mode === "light"
            ? "/images/nemo-n-light.png"
            : "/images/nemo-n-dark.png";

    // Эффект обновления фавикона
    useEffect(() => {
        if (!updateFavicon) {
            return;
        }

        const link =
            (document.querySelector("link[rel*='icon']") as HTMLLinkElement) ||
            document.createElement("link");
        link.type = "image/png";
        link.rel = "icon";
        link.href = faviconSrc;

        if (!document.head.contains(link)) {
            document.head.appendChild(link);
        }
    }, [updateFavicon, faviconSrc]);

    return (
        <div
            className={`${styles.logoContainer} ${className || ""}`}
            data-size={size}
        >
            <img src={logoSrc} alt={logoText} className={styles.logoImage} />
        </div>
    );
}
