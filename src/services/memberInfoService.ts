import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";
import extractEmail from "../utils/extractEmail";
import e from "express";

interface MemberInfo {
    user_id: string;
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

        if (error && error.code === '42703') {
            throw new Error("Member not found: " + user_email);
        }

        if (!members) {
            throw new Error("Member not found: " + user_email);
        }
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

    /**
     * Upload/Update profile photo for a member
     * @param userEmail - The email of the member
     * @param file - The file to upload
     * @returns the public URL of the uploaded photo
     */
    async uploadProfilePhoto(userEmail: string, file: Express.Multer.File) {
        try {
            // First check if the member exists
            const { data: memberData, error: memberError } = await this.supabase
                .from('member_info')
                .select('profile_photo_url')
                .eq('user_email', userEmail)
                .single();

            if (memberError) {
                throw new Error(`Member with email '${userEmail}' not found.`);
            }

            // Delete the old photo if it exists
            const oldPhotoUrl = memberData?.profile_photo_url;
            if (oldPhotoUrl) {
                try {
                    const urlParts = oldPhotoUrl.split('/');
                    // Make sure we have enough parts to find the path and it's from the right bucket
                    if (urlParts.length > 2) {
                        const oldFilePath = urlParts.slice(-2).join('/'); // Gets the last two segments (userId/filename)
                        await this.supabase.storage.from('profile-photos').remove([oldFilePath]);
                    }
                } catch (removeError) {
                    console.error("Error removing old profile photo:", removeError);
                    // Continue with upload even if deletion fails
                }
            }

            // Generate a unique filename to avoid collisions
            const userId = userEmail.replace(/[^a-zA-Z0-9]/g, ''); // Strip special chars for storage path
            const timestamp = Date.now();
            const filePath = `${userId}/${timestamp}_${file.originalname}`;

            // Upload the new photo
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from('profile-photos')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Generate the public URL for the uploaded file
            const { data: publicUrlData } = this.supabase.storage
                .from('profile-photos')
                .getPublicUrl(filePath);

            const publicUrl = publicUrlData.publicUrl;

            // Update the member_info table with the new photo URL
            const { error: updateError } = await this.supabase
                .from('member_info')
                .update({ profile_photo_url: publicUrl })
                .eq('user_email', userEmail);

            if (updateError) throw updateError;

            return {
                success: true,
                photoUrl: publicUrl
            };
        } catch (error) {
            console.error('Error uploading profile photo:', error);
            throw error;
        }
    }

    /**
     * Delete profile photo for a member
     * @param userEmail - The email of the member
     * @returns success message
     */
    async deleteProfilePhoto(userEmail: string) {
        try {
            // Get the current photo URL
            const { data: memberData, error: memberError } = await this.supabase
                .from('member_info')
                .select('profile_photo_url')
                .eq('user_email', userEmail)
                .single();

            if (memberError) {
                throw new Error(`Member with email '${userEmail}' not found.`);
            }

            const photoUrl = memberData?.profile_photo_url;
            if (photoUrl) {
                try {
                    const urlParts = photoUrl.split('/');
                    // Make sure we have enough parts to find the path
                    if (urlParts.length > 2) {
                        const filePath = urlParts.slice(-2).join('/'); // Gets the last two segments (userId/filename)
                        await this.supabase.storage.from('profile-photos').remove([filePath]);
                    }
                } catch (removeError) {
                    console.error("Error removing profile photo from storage:", removeError);
                    // Continue to clear the DB reference even if storage deletion fails
                }

                // Clear the photo URL in the database
                const { error: updateError } = await this.supabase
                    .from('member_info')
                    .update({ profile_photo_url: null })
                    .eq('user_email', userEmail);

                if (updateError) throw updateError;

                return {
                    success: true,
                    message: 'Profile photo deleted successfully.'
                };
            } else {
                // No photo URL exists, nothing to delete
                return {
                    success: true,
                    message: 'No profile photo found to delete.'
                };
            }
        } catch (error) {
            console.error('Error deleting profile photo:', error);
            throw error;
        }
    }
}