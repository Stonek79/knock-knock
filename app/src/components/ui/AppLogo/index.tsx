import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { APP_NAME } from "@/lib/constants";
import styles from "./AppLogo.module.css";

interface AppLogoProps {
    width?: number | string; // Игнорируем или используем как размер шрифта
    height?: number | string;
    className?: string;
    updateFavicon?: boolean;
}

export function AppLogo({
    className,
    updateFavicon = false,
    width,
}: AppLogoProps) {
    const { i18n } = useTranslation();
    const isRu = i18n.language.startsWith("ru");

    // Текст логотипа
    const logoText = isRu ? "Тук-Тук" : APP_NAME;

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

    // Вычисляем размер шрифта, если передан width (эвристика)
    const fontSize = typeof width === "number" ? width / 3.5 : undefined;

    return (
        <span
            className={`${styles.logoText} ${className || ""}`}
            style={{ fontSize: fontSize }}
        >
            {logoText}
        </span>
    );
}
