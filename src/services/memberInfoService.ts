import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";
import { Member } from "../types/member";

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
        const { data: members, error } = await this.supabase.from('member_hours_summary').select('*').eq('user_email', user_email);

        if (error && error.code === '42703') {
            throw new Error("Member not found: " + user_email);
        }

        if (!members) {
            throw new Error("Member not found: " + user_email);
        }

        // Get event attendance for each member
        const membersWithAttendance = await Promise.all(members.map(async (member) => {
            try {
                const eventAttendance = await this.getEventAttendance(member.user_email);
                return { ...member, event_attendance: eventAttendance };
            } catch (error) {
                console.error(`Error fetching event attendance for ${member.user_email}:`, error);
                return { ...member, event_attendance: [] };
            }
        }));

        return membersWithAttendance;
    }


    async getAllMemberInfo() {
        // Query the view instead of member_info to get calculated hours
        const { data: members, error } = await this.supabase
            .from('member_hours_summary')
            .select('*')
            .order('total_hours', { ascending: false }); // Optional: order by hours

        if (error) throw error;

        return members;
    }

    /**
     * Get all alumni members
     * Filters at database level for better performance
     */
    async getAlumniMembers() {
        // Query the view and filter for alumni only
        const { data: members, error } = await this.supabase
            .from('member_hours_summary')
            .select('*')
            .eq('rank', 'alumni')  // Filter at database level
            .order('total_hours', { ascending: false });

        if (error) throw error;

        return members;
    }

    /**
     * Get all active (non-alumni) members
     * Filters at database level for better performance
     */
    async getActiveMembers() {
        // Query the view and filter out alumni
        const { data: members, error } = await this.supabase
            .from('member_hours_summary')
            .select('*')
            .neq('rank', 'alumni')  // Filter out alumni at database level
            .order('total_hours', { ascending: false });

        if (error) throw error;

        return members;
    }

    async editMemberInfo(user_email: string, updateFields: Record<string, any>) {
        const { data, error } = await this.supabase
            .from('member_info')
            .update(updateFields)
            .eq('user_email', user_email)
            .select()

        if (error) throw error;

        return data;
    }

    /**
     * Get member by email - Helper method for permission checks
     * @param user_email - The email of the member
     * @returns Member information including rank
     */
    async getMemberByEmail(user_email: string): Promise<Member | null> {
        const { data: member, error } = await this.supabase
            .from('member_info')
            .select('*')
            .eq('user_email', user_email)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned
                return null;
            }
            throw error;
        }

        // Get role from allowed_members
        const { data: roleData } = await this.supabase
            .from('allowed_members')
            .select('role')
            .eq('email', user_email)
            .single();

        return {
            ...member,
            role: roleData?.role || ''
        } as Member;
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
            const { error } = await this.supabase
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
            const { error: uploadError } = await this.supabase.storage
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

    /**
     * Get event attendance for a member
     * @param userEmail - The email of the member
     * @returns array of events the member attended
     */
    async getEventAttendance(userEmail: string) {
        try {
            const { data, error } = await this.supabase
                .from('member_info')
                .select(`
                    id,
                    event_attendance!inner(
                        event_id,
                        events!inner(
                            id,
                            event_name,
                            event_date,
                            event_description,
                            event_hours,
                            event_hours_type
                        )
                    )
                `)
                .eq('user_email', userEmail)
                .eq('event_attendance.status', 'attended')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    return [];
                }
                throw error;
            }

            // Transform the data to match the expected format
            const eventAttendance = data.event_attendance?.map((attendance: any) => ({
                event_id: attendance.events.id,
                event_name: attendance.events.event_name,
                event_date: attendance.events.event_date,
                event_description: attendance.events.event_description,
                event_hours: attendance.events.event_hours,
                event_hours_type: attendance.events.event_hours_type
            })) || [];

            return eventAttendance;
        } catch (error) {
            console.error('Error getting event attendance:', error);
            throw error;
        }
    }

    /**
     * Get active members summary (optimized for networking page)
     * Returns pledge and inducted members (excludes alumni) with essential fields only
     * Uses member_hours_summary view with role to avoid N+1 queries
     */
    async getActiveMembersSummary() {
        const { data: members, error } = await this.supabase
            .from('member_hours_summary')
            .select(`
                id,
                user_email,
                name,
                major,
                profile_photo_url,
                total_hours,
                rank,
                member_status,
                about,
                graduating_year,
                links,
                role
            `)
            .neq('rank', 'alumni')
            .eq('role', 'general-member')
            .order('name', { ascending: true });

        if (error) throw error;

        // Extract first link for each member
        return members.map(member => {
            // Extract first link
            let firstLink = null;
            if (member.links) {
                if (Array.isArray(member.links) && member.links.length > 0) {
                    firstLink = member.links[0];
                } else if (typeof member.links === 'string') {
                    firstLink = member.links.split(',')[0].trim();
                }
            }

            return {
                id: member.id,
                user_email: member.user_email,
                name: member.name,
                major: member.major,
                profile_photo_url: member.profile_photo_url,
                total_hours: member.total_hours,
                rank: member.rank,
                member_status: member.member_status,
                about: member.about,
                graduating_year: member.graduating_year,
                first_link: firstLink
            };
        });
    }

    /**
     * Get alumni members summary (optimized for alumni page)
     * Returns alumni with essential fields only
     */
    async getAlumniMembersSummary() {
        const { data: members, error } = await this.supabase
            .from('member_hours_summary')
            .select(`
                id,
                user_email,
                name,
                major,
                profile_photo_url,
                total_hours,
                rank,
                member_status,
                about,
                graduating_year,
                links,
                role
            `)
            .eq('rank', 'alumni')
            .eq('role', 'general-member')
            .order('name', { ascending: true });

        if (error) throw error;

        // Extract first link for each member
        return members.map(member => {
            // Extract first link
            let firstLink = null;
            if (member.links) {
                if (Array.isArray(member.links) && member.links.length > 0) {
                    firstLink = member.links[0];
                } else if (typeof member.links === 'string') {
                    firstLink = member.links.split(',')[0].trim();
                }
            }

            return {
                id: member.id,
                user_email: member.user_email,
                name: member.name,
                major: member.major,
                profile_photo_url: member.profile_photo_url,
                total_hours: member.total_hours,
                rank: member.rank,
                member_status: member.member_status,
                about: member.about,
                graduating_year: member.graduating_year,
                first_link: firstLink
            };
        });
    }

    /**
     * Get full member details by email (for modal display)
     * Returns all member information including hours breakdown
     */
    async getMemberDetailsByEmail(userEmail: string) {
        const { data: member, error } = await this.supabase
            .from('member_hours_summary')
            .select('*')
            .eq('user_email', userEmail)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw error;
        }

        // Get event attendance
        const eventAttendance = await this.getEventAttendance(userEmail);

        return {
            ...member,
            event_attendance: eventAttendance
        };
    }

    /**
     * Archive a member (soft delete)
     * @param email - Email of member to archive
     * @returns Success message
     */
    async archiveMember(email: string) {
        const { error } = await this.supabase
            .from('allowed_members')
            .update({ deleted_at: new Date().toISOString() })
            .eq('email', email)
            .is('deleted_at', null); // Only archive if not already archived

        if (error) {
            throw new Error(`Failed to archive member: ${error.message}`);
        }

        return { success: true, message: `Member ${email} archived successfully` };
    }

    /**
     * Restore an archived member
     * @param email - Email of member to restore
     * @returns Success message
     */
    async restoreMember(email: string) {
        const { error } = await this.supabase
            .from('allowed_members')
            .update({ deleted_at: null })
            .eq('email', email)
            .not('deleted_at', 'is', null); // Only restore if currently archived

        if (error) {
            throw new Error(`Failed to restore member: ${error.message}`);
        }

        return { success: true, message: `Member ${email} restored successfully` };
    }

    /**
     * Get all archived members
     * @returns List of archived members
     */
    async getArchivedMembers() {
        const { data, error } = await this.supabase
            .from('archived_members')
            .select('*')
            .order('deleted_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to get archived members: ${error.message}`);
        }

        return data || [];
    }
}