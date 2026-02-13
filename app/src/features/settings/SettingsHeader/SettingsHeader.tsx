import { Flex, Heading } from "@radix-ui/themes";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import styles from "./settingsheader.module.css";

interface SettingsHeaderProps {
    title: string;
    titleKey?: string;
    children?: ReactNode;
}

export function SettingsHeader({
    title,
    titleKey,
    children,
}: SettingsHeaderProps) {
    const { t } = useTranslation();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    // На десктопе не показываем кнопку "Назад"
    if (!isMobile) {
        return (
            <Flex align="center" gap="3" p="4">
                {children}
                <Heading size="4">
                    {titleKey ? t(titleKey, title) : title}
                </Heading>
            </Flex>
        );
    }

    // На мобильной показываем кнопку "Назад"
    return (
        <Flex align="center" gap="3" p="4">
            <Link to="/settings" className={styles.backLink}>
                <ArrowLeft size={20} />
            </Link>
            {children}
            <Heading size="4">{titleKey ? t(titleKey, title) : title}</Heading>
        </Flex>
    );
}
