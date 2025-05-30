import { SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createSupabaseClient } from '../config/db';

config();

interface Entity {
    id: string;
    image: string;
    name: string;
    role: string;
    email: string;
    major: string;
    location: string;
}

export default class EboardService {
    private supabase: SupabaseClient;

    /**
     * Constructor for the EboardService
     */
    constructor() {
        this.supabase = createSupabaseClient();
    }

    /**
     * Set the token for the user
     * @param token - The token for the user
     */
    setToken(token: string) {
        if (!token) return;
        this.supabase = createSupabaseClient(token);
    }

    async getEboard() {
        const { data, error } = await this.supabase
            .from('eboard')
            .select('*');

        if (error) throw error;
        return data;
    }

    async addEboard(name: string, role: string, email: string, major: string, location: string) {
        const { data, error } = await this.supabase
            .from('eboard')
            .insert({
                name,
                role,
                email,
                major,
                location
            });

        if (error) throw error;
        return data;
    }
        
}