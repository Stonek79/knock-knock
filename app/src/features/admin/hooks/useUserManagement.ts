import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DB_TABLES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types/profile";

/**
 * Hook for managing users (Admin Panel).
 * Handles fetching, searching, banning, and unbanning.
 */
export function useUserManagement() {
    const [search, setSearch] = useState("");

    const {
        data: users = [],
        isLoading,
        refetch,
        error,
    } = useQuery({
        queryKey: ["admin", "users", search],
        queryFn: async () => {
            let query = supabase
                .from(DB_TABLES.PROFILES)
                .select("*")
                .order("created_at", { ascending: false });

            if (search) {
                query = query.ilike("username", `%${search}%`);
            }

            const { data, error } = await query;
            if (error) {
                throw error;
            }
            return data as Profile[];
        },
    });

    const banUser = async (userId: string, durationDays = 7) => {
        const until = new Date();
        until.setDate(until.getDate() + durationDays);

        const { error } = await supabase
            .from(DB_TABLES.PROFILES)
            .update({ banned_until: until.toISOString() })
            .eq("id", userId);

        if (error) {
            throw error;
        }
        return refetch();
    };

    const unbanUser = async (userId: string) => {
        const { error } = await supabase
            .from(DB_TABLES.PROFILES)
            .update({ banned_until: null })
            .eq("id", userId);

        if (error) {
            throw error;
        }
        return refetch();
    };

    return {
        users,
        isLoading,
        error,
        search,
        setSearch,
        banUser,
        unbanUser,
        refetch,
    };
}
