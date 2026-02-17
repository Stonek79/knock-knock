import { Flex, Heading } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

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

    return (
        <Flex align="center" gap="3" p="4">
            {children}
            <Heading size="4">{titleKey ? t(titleKey, title) : title}</Heading>
        </Flex>
    );
}
