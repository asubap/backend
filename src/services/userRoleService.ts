import { SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { createSupabaseClient } from '../config/db';

dotenv.config();

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

    /**
     * Get the user ID from the email
     * @param email - The email of the user
     * @returns The user ID of the user
     */
    async getUserID(email: string) {
        const { data: user_id, error } = await this.supabase
            .from('user_email_map')
            .select('user_id')
            .eq('email', email)
            .single();

        if (error) throw error;
        return user_id.user_id;
    }

    async getUserEmail(user_id: string) {
        const { data: email, error } = await this.supabase
            .from('user_email_map')
            .select('email')
            .eq('user_id', user_id)
            .single();

        if (error) throw error;
        return email.email;
    }

    /**
     * Get the roles of a user
     * @param user_id - The ID of the user
     * @returns The roles of the user
     */
    async getUserRoles(user_id: string) {
        const { data, error } = await this.supabase
            .from('user_roles')
            .select(`
                role_id
            `)
            .eq('user_id', user_id);

        if (error) throw error;
        
        // Convert role IDs to role names
        return data.map((role: UserRole) => ({
            role: this.convertIdToRole(role.role_id)
        }));
    }

    /**
     * Convert a role to an ID
     * @param role - The role to convert
     * @returns The ID of the role
     */
    private convertRoleToId(role: string): number {
        switch (role) {
            case 'e-board':
                return 1;
            case 'sponsor':
                return 2;
            case 'general-member':
                return 3;
            default:
                throw new Error('Invalid role');
        }
    }

    /**
     * Convert an ID to a role
     * @param roleId - The ID of the role
     * @returns The role of the ID
     */
    private convertIdToRole(roleId: number): string {
        switch (roleId) {
            case 1:
                return 'e-board';
            case 2:
                return 'sponsor';
            case 3:
                return 'general-member';
            default:
                throw new Error('Invalid role ID');
        }
    }

    /**
     * Assign a role to a user
     * @param user_id - The ID of the user
     * @param role - The role to assign
     * @returns Whether the role was assigned
     */
    async assignRole(user_id: string, role: string) {
        const roleNumber = this.convertRoleToId(role);
        
        const { data: existingRole } = await this.supabase
            .from('user_roles')
            .select()
            .eq('user_id', user_id)
            .eq('role_id', roleNumber)
            .single();

        if (existingRole) {
            return false;
        }

        const { error } = await this.supabase
            .from('user_roles')
            .insert([
                { user_id, role_id: roleNumber }
            ])
            .select()
            .single();

        if (error) throw error;
        return true;
    }

    /**
     * Remove a role from a user
     * @param user_id - The ID of the user
     * @param role - The role to remove
     * @returns Whether the role was removed
     */
    async removeRole(user_id: string, role: string) {
        const roleNumber = this.convertRoleToId(role);

        const { error } = await this.supabase
            .from('user_roles')
            .delete()
            .eq('user_id', user_id)
            .eq('role_id', roleNumber);

        if (error) throw error;
        return true;
    }
}