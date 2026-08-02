import { useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/constants/routes";
import { useJoinRoom } from "../../hooks/useJoinRoom";
import styles from "./joinroomview.module.css";

export function JoinRoomView() {
    const { token } = useParams({ from: ROUTES.JOIN });
    const navigate = useNavigate();
    const toast = useToast();
    const { t } = useTranslation();

    const { invite, isLoading, isJoining, error, handleJoin } =
        useJoinRoom(token);

    const onJoinClick = async () => {
        const result = await handleJoin();

        if (!result.success) {
            toast({
                title: result.error || t("common.error", "Произошла ошибка"),
                variant: "error",
            });
        } else {
            toast({
                title: t("join.success", "Успешно!"),
                variant: "success",
            });
            navigate({
                to: ROUTES.CHAT_ROOM,
                params: { roomId: result.room || "" },
            });
        }
    };

    if (isLoading) {
        return (
            <Flex className={styles.container} align="center" justify="center">
                <div className={`${styles.cardWrapper} ${styles.fadeIn}`}>
                    <Flex
                        direction="column"
                        align="center"
                        justify="center"
                        gap="4"
                    >
                        <Spinner size="lg" />
                        <Text intent="secondary" weight="medium">
                            {t("common.loading", "Загрузка...")}
                        </Text>
                    </Flex>
                </div>
            </Flex>
        );
    }

    if (error || !invite) {
        return (
            <Flex className={styles.container} align="center" justify="center">
                <div className={`${styles.cardWrapper} ${styles.fadeIn}`}>
                    <Box className={styles.card}>
                        <Flex direction="column" align="center" gap="5">
                            <Text
                                size="xl"
                                weight="bold"
                                intent="error"
                                align="center"
                            >
                                {error || t("common.error", "Произошла ошибка")}
                            </Text>
                            <Button
                                onClick={() => navigate({ to: ROUTES.HOME })}
                                className={styles.joinBtn}
                                size="lg"
                            >
                                {t("common.backToHome", "На главную")}
                            </Button>
                        </Flex>
                    </Box>
                </div>
            </Flex>
        );
    }

    // Достаем данные комнаты через expand (expand.room)
    const roomName =
        invite.expand?.room?.name || t("join.privateRoom", "Приватная комната");

    return (
        <Flex className={styles.container} align="center" justify="center">
            <div className={`${styles.cardWrapper} ${styles.fadeIn}`}>
                <Box className={styles.card}>
                    <Flex direction="column" align="center" gap="5">
                        <Avatar size="xl" name={roomName} />

                        <Flex direction="column" align="center" gap="2">
                            <Text size="xl" weight="bold" align="center">
                                {roomName}
                            </Text>
                            <Text size="sm" intent="secondary" align="center">
                                {t(
                                    "join.subtitle",
                                    "Вас пригласили присоединиться к группе",
                                )}
                            </Text>
                        </Flex>

                        <Flex
                            direction="column"
                            gap="3"
                            className={styles.actions}
                        >
                            <Button
                                onClick={onJoinClick}
                                disabled={isJoining}
                                className={styles.joinBtn}
                                size="lg"
                            >
                                {isJoining ? (
                                    <Flex
                                        align="center"
                                        gap="2"
                                        justify="center"
                                    >
                                        <Spinner size="sm" />
                                        <span>
                                            {t(
                                                "join.joining",
                                                "Присоединение...",
                                            )}
                                        </span>
                                    </Flex>
                                ) : (
                                    t("join.joinButton", "Присоединиться")
                                )}
                            </Button>
                            <Button
                                variant="soft"
                                intent="neutral"
                                onClick={() => navigate({ to: ROUTES.HOME })}
                                className={styles.cancelBtn}
                                size="lg"
                                disabled={isJoining}
                            >
                                {t("common.cancel", "Отмена")}
                            </Button>
                        </Flex>
                    </Flex>
                </Box>
            </div>
        </Flex>
    );
}
