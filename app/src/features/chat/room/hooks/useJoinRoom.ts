import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { inviteService } from "@/lib/services/invite.service";
import type {
    InvitesResponse,
    RoomsResponse,
} from "@/lib/types/pocketbase-types";

export function useJoinRoom(token: string) {
    const { t } = useTranslation();
    const [invite, setInvite] = useState<InvitesResponse<{
        room: RoomsResponse;
    }> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function fetchInvite() {
            const res = await inviteService.validateInvite<{
                room: RoomsResponse;
            }>(token);
            if (!isMounted) {
                return;
            }

            if (res.isErr()) {
                setError(
                    t("join.invalidInvite", "Инвайт недействителен или удален"),
                );
            } else {
                setInvite(res.value);
            }
            setIsLoading(false);
        }

        fetchInvite();

        return () => {
            isMounted = false;
        };
    }, [token, t]);

    const handleJoin = async () => {
        if (!invite) {
            return {
                success: false,
                error: t(
                    "join.invalidInvite",
                    "Инвайт недействителен или удален",
                ),
            };
        }
        setIsJoining(true);
        try {
            const hash = window.location.hash.replace("#", "");
            const joinRes = await inviteService.joinRoomByToken(token, hash);

            if (joinRes.isErr()) {
                return {
                    success: false,
                    error: t("join.errorJoin", "Не удалось присоединиться"),
                };
            }
            return {
                success: true,
                room: invite.room,
            };
        } finally {
            setIsJoining(false);
        }
    };

    return { invite, isLoading, isJoining, error, handleJoin };
}
