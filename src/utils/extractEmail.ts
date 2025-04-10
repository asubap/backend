import { createSupabaseClient } from "../config/db";

/**
 * Extract the email from the user_email_map table
 * @param user_id 
 * @returns the email of the user
 */
export default async function extractEmail(user_id: string) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('user_email_map')
        .select('email')
        .eq('user_id', user_id);

    if (error) throw error;
    return data[0].email;
}

