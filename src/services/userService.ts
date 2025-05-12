import { SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createSupabaseClient } from '../config/db';

config();

interface UserRole {
    role_id: number;
}

export default class UserRoleService {
    private supabase: SupabaseClient;

    /**
     * Constructor for the UserRoleService
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

    async getAllUsers() {
        const { data, error } = await this.supabase
            .from('allowed_members')
            .select('*');

        if (error) throw error;
        return data;
    }

    async getUserRole(user_email: string) {
        const { data, error } = await this.supabase
            .from('allowed_members')
            .select('role')
            .eq('email', user_email);

        if (error) throw error;
        return data[0].role;
    }

    async addUser(user_email: string, role: string) {
        const { data, error } = await this.supabase
            .from('allowed_members')
            .insert({ email: user_email, role: role });

        if (error) throw error;
        return data;
    }

    async deleteUser(user_email: string) {
        const { data, error } = await this.supabase
            .from('allowed_members')
            .delete()
            .eq('email', user_email);

        if (error) throw error;
        return data;
    }

    async updateRole(user_email: string, role: string) {
        const { data, error } = await this.supabase
            .from('allowed_members')
            .update({ role: role })
            .eq('email', user_email);

        if (error) throw error;
        return data;
    }

    // get user email by user id
    async getUserEmail(user_id: string) {
        const { data, error } = await this.supabase
            .from('users')
            .select('email')
            .eq('id', user_id)
            .single();

        if (error) throw error;
        return data.email;
    }
}