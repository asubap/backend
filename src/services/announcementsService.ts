import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";
import sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';
import sanitizeHtml from 'sanitize-html';

import juice from 'juice'
// I WILL USE THIS LATER IF THERE IS A POSSIBILITY OF A XSS ATTACK WHICH IS VERY UNLIKELY SINCE ONLY ADMINS CAN CREATE ANNOUNCEMENTS
// Allow everything EXCEPT dangerous elements (script, iframe, etc.)
const sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: false,        // Allow all tags
    allowedAttributes: false,  // Allow all attributes
    disallowedTagsMode: 'discard',
    // Block dangerous tags that can execute scripts or load external content
    exclusiveFilter: (frame) => {
        const dangerousTags = ['script', 'iframe'];
        return dangerousTags.includes(frame.tag);
    }
};


export class announcementsService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createSupabaseClient();
    }

    setToken(token: string) {
        this.supabase = createSupabaseClient(token);
    }

    async getannouncements() {
        const { data, error } = await this.supabase
            .from('announcements')
            .select('*');

        if (error) throw error;
        return data;
    }

    async getannouncementByID(announcement_id: string) {
        const { data, error } = await this.supabase
            .from('announcements')
            .select('*')
            .eq('id', announcement_id);

        if (error) throw error;
        return data;
    }

    async addannouncements(title: string, description: string) {
        try{

            
            const cleanDescription = sanitizeHtml(description, sanitizeOptions);
            const { error: aError } = await this.supabase
                .from('announcements')
                .insert(
                    {
                        title: title,
                        description: cleanDescription
                    });
                if (aError) throw aError;
            
                const emailList = await this.getUsersEmails(title, cleanDescription);
                if (!emailList || emailList.length === 0) {
                    throw new Error('No users found');
                }
            // Send email to users
            await this.sendAnnouncments(emailList, title, cleanDescription);
            return ("Announcement added and sent successfully");
         
            
        }
        catch (error) {
            console.error('Error adding or sending announcement:', error);
            throw new Error('Failed to add or send announcement');
        }
    }

    async getUsersEmails(title: string, description: string){
        try{
            // Join allowed_members with member_info to filter by rank
            // Filter out: sponsors, e-board, alumni, and archived members
            const { data: allMemberEmails, error: eError } = await this.supabase
                .from('allowed_members')
                .select(`
                    email,
                    member_info!inner(rank, deleted_at)
                `)
                .neq('role', 'sponsor')
                .neq('role', 'e-board')
                .neq('member_info.rank', 'alumni')
                .is('member_info.deleted_at', null);

            if (eError) throw eError;

            //combining all emails to one unique list of emails 
            const emailsFromMembers = allMemberEmails.map(member => member.email);
            return emailsFromMembers;
        }
        catch (error) {
            console.error('Error fetching emails:', error);
            throw error;
        }
    }

    async sendAnnouncments(emailList: string[], title: string, description: string): Promise<void> {
          try {
            // Create email messages for each recipient using dynamic template
            // const messages = emailList.map(email => ({
            //     to: email,
            //     from: process.env.SENDGRID_FROM_EMAIL || 'your-verified-sender@example.com',
            //     templateId: process.env.SENDGRID_TEMPLATE_ID || '', // Your dynamic template ID
            //     dynamicTemplateData: {
            //       name: title,
            //       description: description,
            //       email_type: "announcement" // To distinguish from events in template
            //     }
            // }));

            const inlinedDescription = juice(description);

            // 3. Send via SendGrid
            const messages = emailList.map(email => ({
                to: email,
                from: process.env.SENDGRID_FROM_EMAIL || 'your-verified-sender@example.com',
                templateId: process.env.SENDGRID_TEMPLATE_ID || '', // Your dynamic template ID
                dynamicTemplateData: {
                  name: title,
                  description: inlinedDescription,
                  email_type: "announcement" // To distinguish from events in template
                }
            }));
                
                

            try {
                 //Send all emails in parallel
                const promises = messages.map(msg => sgMail.send(msg));
                await Promise.all(promises);
                
            } catch (error) {
                console.error(error);
                
            }
            console.log(`Successfully sent invitation emails to ${emailList.length} users.`);
            
        
         
       
           
          } catch (error) {
            console.error('Error sending invitation emails:', error);
            if (error) {
              console.error('SendGrid API error:', error);
            }
            throw new Error('Failed to send invitation emails');
          }
        }

    async editannouncements(announcement_id: string, title: string, description: string ) {
         // Build an update object only with non-empty fields
         const updateFields: Record<string, string> = {};
         if (title && title.trim() !== '') {
             updateFields.title = title;
         }
         if (description && description.trim() !== '') {
            updateFields.description = sanitizeHtml(description, sanitizeOptions);
         }
         
         // If there's nothing to update, respond accordingly
         if (Object.keys(updateFields).length === 0) {
             throw { error: 'No valid update fields provided.' }
         }
        const { error } = await this.supabase
            .from('announcements')
            .update(updateFields)
            .eq('id', announcement_id);

        if (error) throw error;
        return "Updated announcement";
    }

    async deleteannouncements(announcement_id: string) {
        const { error } = await this.supabase
            .from('announcements')
            .delete()
            .eq('id', announcement_id);

        if (error) throw error;
        return "Deleted announcement";
    }
}
