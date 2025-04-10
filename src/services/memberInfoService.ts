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
    async getMemberInfo(user_email: string) {
        const { data: members, error } = await this.supabase.from('member_info').select('*').eq('user_email', user_email);
        
        if (error) throw error;

        // Get roles for each member
        const membersWithRoles = await Promise.all(members.map(async (member) => {
            const { data: roleData, error: roleError } = await this.supabase
                .from('allowed_members')
                .select('role')
                .eq('email', member.user_email)
                .single();

            if (roleError) {
                console.error(`Error fetching role for ${member.user_email}:`, roleError);
                return { ...member, role: null };
            }

            return { ...member, role: roleData?.role };
        }));

        return membersWithRoles;
    }


    async getAllMemberInfo() {
        const { data: members, error } = await this.supabase.from('member_info').select('*');
        
        if (error) throw error;

        // Get roles for each member
        const membersWithRoles = await Promise.all(members.map(async (member) => {
            const { data: roleData, error: roleError } = await this.supabase
                .from('allowed_members')
                .select('role')
                .eq('email', member.user_email)
                .single();

            if (roleError) {
                console.error(`Error fetching role for ${member.user_email}:`, roleError);
                return { ...member, role: null };
            }

            return { ...member, role: roleData?.role || null };
        }));

        return membersWithRoles;
    }

    async editMemberInfo(user_email: string, updateFields: Record<string, string>) {
        const { data, error } = await this.supabase
            .from('member_info')
            .update(updateFields)
            .eq('user_email', user_email)
            .select()

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