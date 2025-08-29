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

    async getUserEmail(user_id: string) {
        // Use service role client for admin API
        const adminClient = createSupabaseClient(undefined, true); // useServiceRole = true
        const { data, error } = await adminClient.auth.admin.getUserById(user_id);
    
        if (error) throw error;
        return data.user.email;
    }

    async getUserIdByEmail(user_email: string) {
        // Use service role client for admin API
        const adminClient = createSupabaseClient(undefined, true);
        console.log(adminClient);
        const { data: userData, error: userError } = await adminClient.auth.admin.listUsers();
        if (userError) throw userError;
        console.log(userData);
        const user = userData.users.find(u => u.email === user_email);
        console.log(user);
        if (!user) {
            throw new Error("User not found");
        }

        return user.id;
    }
}
