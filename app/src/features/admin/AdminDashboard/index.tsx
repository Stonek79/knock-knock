import { Button, Card, Flex, Grid, Text } from '@radix-ui/themes';
import { Link } from '@tanstack/react-router';
import { AlertOctagon, ShieldAlert, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TestTools } from './TestTools';

export function AdminDashboard() {
    const { t } = useTranslation();

    return (
        <Flex direction="column" gap="6">
            <Text size="5" weight="bold">
                {t('admin.dashboard', 'Dashboard')}
            </Text>

            <Grid columns={{ initial: '1', md: '3' }} gap="4">
                <Card>
                    <Flex direction="column" gap="2">
                        <Flex align="center" gap="2">
                            <Users size={20} />
                            <Text weight="bold">
                                {t('admin.users', 'Users')}
                            </Text>
                        </Flex>
                        <Text size="7">--</Text>
                        <Button variant="soft" asChild>
                            <Link to="/admin/users">
                                {t('admin.manageUsers', 'Manage Users')}
                            </Link>
                        </Button>
                    </Flex>
                </Card>

                <Card>
                    <Flex direction="column" gap="2">
                        <Flex align="center" gap="2">
                            <ShieldAlert size={20} />
                            <Text weight="bold">
                                {t('admin.reports', 'Reports')}
                            </Text>
                        </Flex>
                        <Text size="7">0</Text>
                        <Button variant="soft" disabled>
                            {t('admin.queueEmpty', 'Queue Empty')}
                        </Button>
                    </Flex>
                </Card>

                <Card>
                    <Flex direction="column" gap="2">
                        <Flex align="center" gap="2">
                            <AlertOctagon size={20} />
                            <Text weight="bold">{t('admin.bans', 'Bans')}</Text>
                        </Flex>
                        <Text size="7">--</Text>
                        <Button variant="soft" disabled>
                            {t('admin.viewBans', 'View Bans')}
                        </Button>
                    </Flex>
                </Card>
            </Grid>

            <TestTools />

            <Text mt="4" color="gray" size="2">
                Admin Tools v1.0 - Use responsibly.
            </Text>
        </Flex>
    );
}
