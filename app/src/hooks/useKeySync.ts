import { useEffect, useRef } from "react";
import { DB_TABLES } from "@/lib/constants/db";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useKeystore } from "./useKeystore";

/**
 * Хук для автоматической синхронизации публичных ключей пользователя с его профилем в Supabase.
 * Работает в фоновом режиме:
 * 1. Инициализирует ключи, если они отсутствуют.
 * 2. Проверяет наличие ключей в профиле Supabase.
 * 3. При необходимости обновляет профиль.
 */
export function useKeySync() {
    const { user } = useAuthStore();
    const { initialized, initializeKeys, publicKeyX25519, publicKeyEd25519 } =
        useKeystore();
    const isSyncing = useRef(false);

    useEffect(() => {
        if (user && !initialized) {
            initializeKeys();
        }
    }, [user, initialized, initializeKeys]);

    useEffect(() => {
        async function syncKeys() {
            if (
                !user ||
                !initialized ||
                !publicKeyX25519 ||
                !publicKeyEd25519 ||
                isSyncing.current
            ) {
                return;
            }

            try {
                isSyncing.current = true;

                // Сначала проверяем, нужно ли обновление
                const { data: profile, error: fetchError } = await supabase
                    .from(DB_TABLES.PROFILES)
                    .select("public_key_x25519, public_key_signing")
                    .eq("id", user.id)
                    .single();

                if (fetchError) {
                    console.error(
                        "Failed to fetch profile during key sync:",
                        fetchError,
                    );
                    return;
                }

                // Если ключи в БД отсутствуют или не совпадают с локальными — обновляем
                if (
                    profile.public_key_x25519 !== publicKeyX25519 ||
                    profile.public_key_signing !== publicKeyEd25519
                ) {
                    const { error: updateError } = await supabase
                        .from(DB_TABLES.PROFILES)
                        .update({
                            public_key_x25519: publicKeyX25519,
                            public_key_signing: publicKeyEd25519,
                        })
                        .eq("id", user.id);

                    if (updateError) {
                        console.error(
                            "Failed to update public keys in profile:",
                            updateError,
                        );
                    } else {
                        console.log(
                            "Public keys successfully synchronized with profile",
                        );
                    }
                }
            } catch (error) {
                console.error("Error during key synchronization:", error);
            } finally {
                isSyncing.current = false;
            }
        }

        syncKeys();
    }, [user, initialized, publicKeyX25519, publicKeyEd25519]);
}
