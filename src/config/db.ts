import { config } from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

config();

const supabaseUrl: string = process.env.VITE_SUPABASE_URL || "";
const anonKey: string = process.env.VITE_SUPABASE_ANON_KEY || "";
const serviceRoleKey: string = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || (!anonKey && !serviceRoleKey)) {
    console.error("Missing Supabase configuration. Please check your environment variables.");
}

export const createSupabaseClient = (
    token?: string,
    useServiceRole: boolean = false
): SupabaseClient => {
    const key = useServiceRole ? serviceRoleKey : anonKey;

    return createClient(supabaseUrl, key, {
        global: {
            headers: (token && !useServiceRole) ? { Authorization: `Bearer ${token}` } : {},
        },
    });
};
