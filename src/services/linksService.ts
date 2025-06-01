import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";

export class LinksService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createSupabaseClient();
    }

    setToken(token: string) {
        this.supabase = createSupabaseClient(token);
    }

    async getLinks(link_name: string) {
        const { data, error } = await this.supabase
            .from("links")
            .select("*")
            .eq('link_name', link_name);
        
        if (error) throw error;
        return data;
    }

    async updateLink(link_name: string, link: string) {
        const { data, error } = await this.supabase
            .from("links")
            .update({ link })
            .eq('link_name', link_name)
            .select();
        
        if (error) throw error;
        return data;
    }
} 