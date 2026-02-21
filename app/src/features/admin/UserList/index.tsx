import { MoreHorizontal, Search, UserCheck, UserX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Table } from "@/components/ui/Table";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { COMPONENT_INTENT, USER_ROLE } from "@/lib/constants";
import { useUserManagement } from "../hooks/useUserManagement";
import styles from "./userlist.module.css";

export function UserList() {
    const { t } = useTranslation();
    const { users, search, setSearch, banUser, unbanUser } =
        useUserManagement();

    const formatDate = (dateString?: string) => {
        if (!dateString) {
            return "-";
        }
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <Flex direction="column" gap="4" className={styles.container}>
            <div className={styles.header}>
                <Text size="xl" weight="bold">
                    {t("admin.userManagement", "User Management")}
                </Text>
                <TextField
                    placeholder={t("admin.searchUsers", "Search users...")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                >
                    <TextField.Slot>
                        <Search className={styles.searchIcon} />
                    </TextField.Slot>
                </TextField>
            </div>

            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>
                            {t("admin.tableUser", "User")}
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>
                            {t("admin.tableRole", "Role")}
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>
                            {t("admin.tableStatus", "Status")}
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>
                            {t("admin.tableJoined", "Joined")}
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>
                            {t("admin.tableActions", "Actions")}
                        </Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {users.map((user) => {
                        const isBanned =
                            user.banned_until &&
                            new Date(user.banned_until) > new Date();
                        return (
                            <Table.Row key={user.id}>
                                <Table.RowHeaderCell>
                                    <Flex align="center" gap="2">
                                        <Text weight="bold">
                                            {user.display_name}
                                        </Text>
                                        <Text className={styles.userRole}>
                                            (@{user.username})
                                        </Text>
                                    </Flex>
                                </Table.RowHeaderCell>
                                <Table.Cell>
                                    <Badge
                                        intent={
                                            user.role === USER_ROLE.ADMIN
                                                ? COMPONENT_INTENT.PRIMARY
                                                : COMPONENT_INTENT.NEUTRAL
                                        }
                                        variant="soft"
                                    >
                                        {user.role || USER_ROLE.USER}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                    {isBanned ? (
                                        <Badge intent="danger" variant="solid">
                                            {t("admin.statusBanned", "Banned")}
                                        </Badge>
                                    ) : (
                                        <Badge intent="success" variant="soft">
                                            {t("admin.statusActive", "Active")}
                                        </Badge>
                                    )}
                                </Table.Cell>
                                <Table.Cell>
                                    {formatDate(user.created_at)}
                                </Table.Cell>
                                <Table.Cell>
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal
                                                    className={
                                                        styles.actionIcon
                                                    }
                                                />
                                            </Button>
                                        </DropdownMenu.Trigger>
                                        <DropdownMenu.Content>
                                            {isBanned ? (
                                                <DropdownMenu.Item
                                                    color="green"
                                                    onSelect={() =>
                                                        unbanUser(user.id)
                                                    }
                                                >
                                                    <Flex
                                                        gap="2"
                                                        align="center"
                                                    >
                                                        <UserCheck
                                                            className={
                                                                styles.actionIcon
                                                            }
                                                        />{" "}
                                                        {t(
                                                            "admin.actionUnban",
                                                            "Unban User",
                                                        )}
                                                    </Flex>
                                                </DropdownMenu.Item>
                                            ) : (
                                                <DropdownMenu.Item
                                                    intent="danger"
                                                    onSelect={() =>
                                                        banUser(user.id)
                                                    }
                                                >
                                                    <Flex
                                                        gap="2"
                                                        align="center"
                                                    >
                                                        <UserX
                                                            className={
                                                                styles.actionIcon
                                                            }
                                                        />{" "}
                                                        {t(
                                                            "admin.actionBan7",
                                                            "Ban (7 Days)",
                                                        )}
                                                    </Flex>
                                                </DropdownMenu.Item>
                                            )}
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Root>
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table.Root>
        </Flex>
    );
}
