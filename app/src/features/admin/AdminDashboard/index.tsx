import { Link } from "@tanstack/react-router";
import { AlertOctagon, ShieldAlert, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Grid } from "@/components/layout/Grid";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { ROUTES } from "@/lib/constants/routes";
import { TestTools } from "./TestTools";

export function AdminDashboard() {
    const { t } = useTranslation();

    return (
        <Flex direction="column" gap="6">
            <Text size="xl" weight="bold">
                {t("admin.dashboard", "Dashboard")}
            </Text>

            <Grid columns="1" gap="4">
                <Card>
                    <Flex direction="column" gap="2">
                        <Flex align="center" gap="2">
                            <Users />
                            <Text weight="bold">
                                {t("admin.users", "Users")}
                            </Text>
                        </Flex>
                        <Text size="xxl">--</Text>
                        <Button variant="soft" asChild>
                            <Link to={ROUTES.ADMIN_USERS}>
                                {t("admin.manageUsers", "Manage Users")}
                            </Link>
                        </Button>
                    </Flex>
                </Card>

                <Card>
                    <Flex direction="column" gap="2">
                        <Flex align="center" gap="2">
                            <ShieldAlert />
                            <Text weight="bold">
                                {t("admin.reports", "Reports")}
                            </Text>
                        </Flex>
                        <Text size="xxl">0</Text>
                        <Button variant="soft" disabled>
                            {t("admin.queueEmpty", "Queue Empty")}
                        </Button>
                    </Flex>
                </Card>

                <Card>
                    <Flex direction="column" gap="2">
                        <Flex align="center" gap="2">
                            <AlertOctagon />
                            <Text weight="bold">{t("admin.bans", "Bans")}</Text>
                        </Flex>
                        <Text size="xxl">--</Text>
                        <Button variant="soft" disabled>
                            {t("admin.viewBans", "View Bans")}
                        </Button>
                    </Flex>
                </Card>
            </Grid>

            <TestTools />

            <Text intent="secondary" size="md">
                Admin Tools v1.0 - Use responsibly.
            </Text>
        </Flex>
    );
}
