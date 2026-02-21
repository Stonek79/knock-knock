import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { APP_NAME, APP_NAME_RU } from "@/lib/constants";
import type { ComponentSize } from "@/lib/types/ui";
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
    const isRu = i18n.language.startsWith("ru");

    // Текст логотипа
    const logoText = isRu ? APP_NAME_RU : APP_NAME;

    // Фавикон всегда "Кулак" (favicon-en.png)
    const faviconSrc = "/images/favicon-en.png";

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
    }, [updateFavicon]);

    return (
        <span
            className={`${styles.logoText} ${className || ""}`}
            data-size={size}
        >
            {logoText}
        </span>
    );
}
