import { config } from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

config();

const supabaseUrl: string = process.env.VITE_SUPABASE_URL || "";
const supabaseKey: string = process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase configuration. Please check your environment variables.");
}

export const createSupabaseClient = (token?: string): SupabaseClient => {
    if (token) {
        return createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        });
    }
    return createClient(supabaseUrl, supabaseKey);
};
