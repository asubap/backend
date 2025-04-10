import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";
import extractEmail from "../utils/extractEmail";
import e from "express";

interface MemberInfo {
    user_id: string;
    // Add other properties as needed
}

export class MemberInfoService {
    private supabase: SupabaseClient;
    
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
     * Get member info
     * @param user_id 
     * @returns information about the member
     */
    async getMemberInfo(user_id: string) {
        const { data: member_info, error } = await this.supabase
            .from('member_info')
            .select('*')
            .eq('user_id', user_id)

        if (error) throw error;
        return member_info;
    }

    /**
     * Get all member info
     * @returns information about all members
     */
    async getAllMemberInfo() {
        const { data, error } = await this.supabase.from('member_info').select('*');
        
        if (error) throw error;

        // for each member, get their role as well
        const member_info = await Promise.all(data.map(async (member) => {
            const { data: role_data, error: role_error } = await this.supabase.from('user_roles_view').select('*').eq('user_id', member.user_id);
            if (role_error) throw role_error;
            return { ...member, roles: role_data[0].roles };
        }));

        return member_info;
    }


    /**
     * Edit member info
     * @param user_id - The user id of the member
     * @param bio - The bio of the member
     * @param internship - The internship of the member
     * @param first_name - The first name of the member
     * @param last_name - The last name of the member
     * @param year - The year of the member
     * @param major - The major of the member
     * @returns the updated member info
     */
    async editMemberInfo(user_id: string, updateFields: Record<string, string>) {
        const { data, error } = await this.supabase
            .from('member_info')
            .update(updateFields)
            .eq('user_id', user_id)
            .select();

        if (error) throw error;
        return data;
    }

    /**
     * Delete member
     * @param user_id - The user id of the member
     * @returns the updated member info
     */
    async deleteMember(user_id: string) {
        const { data, error } = await this.supabase
            .from('member_info')
            .delete()
            .eq('user_id', user_id)
            .select();
        if (error) throw error;
        return data;
    }

    /**
     * Add member
     * @param user_id - The user id of the member
     * @returns the updated member info
     */
    async addMember(user_id: string) {
        try {
            const { data, error } = await this.supabase
                .from('member_info')
                .insert({ user_id })
                .select();

            if (error) {
                // If it's a duplicate key error, just return true
                if (error.code === '23505') {
                    return true;
                }
                throw error;
            }
            return true;
        } catch (error) {
            console.error('Error in addMember:', error);
            return true; // Return true even if there's an error
        }
    }
}