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
            .from('eboard_faculty')
            .select('*');

        if (error) throw error;
        return data;
    }

    async addRole(role: string, role_email: string, email: string) {
        // Update the user's role
        const { data, error } = await this.supabase
            .from('eboard_faculty')
            .insert({ role: role, email: email, role_email: role_email });

        if (error) throw error;
        return data;
    }

    async editRole(role_email: string, updateFields: Record<string, any>) {
        // Proceed with update
        const { data: updatedRecord, error } = await this.supabase
            .from('eboard_faculty')
            .update(updateFields)
            .eq('role_email', role_email)
            .select();

        if (error) throw error;
        return updatedRecord;
    }

    async deleteRole(role_email: string) {
        const { data, error } = await this.supabase
            .from('eboard_faculty')
            .delete()
            .eq('role_email', role_email)
            .select();

        if (error) throw error;
        return data;
    }
}