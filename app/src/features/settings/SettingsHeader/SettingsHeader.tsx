import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { IconButton } from "@/components/ui/IconButton";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { ROUTES } from "@/lib/constants";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./settingsheader.module.css";

interface SettingsHeaderProps {
    title: string;
    titleKey?: string;
    children?: ReactNode;
}

/**
 * Заголовок страницы настроек.
 * На мобильных показывает кнопку «назад».
 */
export function SettingsHeader({
    title,
    titleKey,
    children,
}: SettingsHeaderProps) {
    const { t } = useTranslation();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    return (
        <Flex align="center" gap="3" p="4">
            {isMobile && (
                <Link to={ROUTES.FAVORITES} data-testid="back-link">
                    {/* Наш кастомный IconButton вместо Radix IconButton */}
                    <IconButton variant="ghost" size="md" shape="round">
                        <ArrowLeftIcon size={ICON_SIZE.md} />
                    </IconButton>
                </Link>
            )}
            {children}
            {/* Нативный h2 вместо Radix Heading */}
            <h2 className={styles.title}>
                {titleKey ? t(titleKey, title) : title}
            </h2>
        </Flex>
    );
}
