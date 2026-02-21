import { useNavigate } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { AppLogo } from "@/components/ui/AppLogo";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./landing.module.css";

/**
 * Главная страница (Лендинг).
 * Отображается для всех неавторизованных пользователей.
 * Сообщает о статусе разработки.
 */
export function LandingPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Flex
            className={styles.container}
            direction="column"
            align="center"
            justify="center"
        >
            <Flex
                direction="column"
                align="center"
                className={styles.content}
                gap="5"
            >
                <span className={styles.badge}>
                    <Construction
                        size={ICON_SIZE.xs}
                        className={styles.badgeIcon}
                    />
                    {t("common.landing.badge")}
                </span>

                <AppLogo size="xl" className={styles.logoImage} updateFavicon />

                <h1 className={styles.title}>{t("common.landing.title")}</h1>

                <p className={styles.descriptionText}>
                    {t("common.landing.description")}
                </p>
            </Flex>

            <Box position="absolute" bottom="5">
                <Button
                    variant="ghost"
                    intent="secondary"
                    onClick={() => navigate({ to: ROUTES.LOGIN })}
                >
                    {t("common.landing.devLogin")}
                </Button>
            </Box>
        </Flex>
    );
}
