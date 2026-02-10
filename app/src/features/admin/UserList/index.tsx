import {
    Badge,
    Button,
    DropdownMenu,
    Flex,
    Table,
    Text,
    TextField,
} from "@radix-ui/themes";
import { MoreHorizontal, Search, UserCheck, UserX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUserManagement } from "../hooks/useUserManagement";

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
        <Flex direction="column" gap="4">
            <Flex justify="between" align="center">
                <Text size="5" weight="bold">
                    {t("admin.userManagement", "User Management")}
                </Text>
                <TextField.Root
                    placeholder={t("admin.searchUsers", "Search users...")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                >
                    <TextField.Slot>
                        <Search size={16} />
                    </TextField.Slot>
                </TextField.Root>
            </Flex>

            <Table.Root variant="surface">
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
                                        <Text color="gray" size="2">
                                            (@{user.username})
                                        </Text>
                                    </Flex>
                                </Table.RowHeaderCell>
                                <Table.Cell>
                                    <Badge
                                        color={
                                            user.role === "admin"
                                                ? "purple"
                                                : "gray"
                                        }
                                    >
                                        {user.role || "user"}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                    {isBanned ? (
                                        <Badge color="red">
                                            {t("admin.statusBanned", "Banned")}
                                        </Badge>
                                    ) : (
                                        <Badge color="green">
                                            {t("admin.statusActive", "Active")}
                                        </Badge>
                                    )}
                                </Table.Cell>
                                <Table.Cell>
                                    {formatDate(user.created_at)}
                                </Table.Cell>
                                <Table.Cell>
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger>
                                            <Button
                                                variant="ghost"
                                                color="gray"
                                            >
                                                <MoreHorizontal size={16} />
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
                                                        <UserCheck size={16} />{" "}
                                                        {t(
                                                            "admin.actionUnban",
                                                            "Unban User",
                                                        )}
                                                    </Flex>
                                                </DropdownMenu.Item>
                                            ) : (
                                                <DropdownMenu.Item
                                                    color="red"
                                                    onSelect={() =>
                                                        banUser(user.id)
                                                    }
                                                >
                                                    <Flex
                                                        gap="2"
                                                        align="center"
                                                    >
                                                        <UserX size={16} />{" "}
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
