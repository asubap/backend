import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";
import sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';
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
            const { error: aError } = await this.supabase
                .from('announcements')
                .insert(
                    {
                        title: title,
                        description: description
                    });
                if (aError) throw aError;
            
                const emailList = await this.getUsersEmails(title, description);
                if (!emailList || emailList.length === 0) {
                    throw new Error('No users found');
                }
            // Send email to users
            await this.sendAnnouncments(emailList, title, description);
            return ("Announcement added successfully");
         
            
        }
        catch (error) {
            console.error('Error adding announcement:', error);
            throw new Error('Failed to add announcement');
        }
    }

    async getUsersEmails(title: string, description: string){
        try{
            // Use individual filters instead of the combined not-in syntax
            const { data: allMemberEmails, error: eError } = await this.supabase
                .from('allowed_members')
                .select('email')
                .neq('role', 'sponsor')
                .neq('role', 'e-board'); 
            
            if (eError) throw eError;

            //combining all emails to one unique list of emails 
            const emailsFromMembers = allMemberEmails.map(member => member.email);
            return emailsFromMembers;
        }
        catch (error) {
            console.error('Error fetching emails:', error);
        }
    }

    async sendAnnouncments(emailList: string[], title: string, description: string): Promise<void> {
          try {
            // Create email messages for each recipient
            const messages = emailList.map(email => ({
                to: email,
                from: process.env.SENDGRID_FROM_EMAIL || 'your-verified-sender@example.com', // Use a verified sender
                subject: `${title}`,
                text: `Hello,\n\nA new announcement has been made:\n\nTitle: ${title}\n${description}\n\nSincerely,\nBAP E-Board`,
                html: `<p>Hello,</p>
                        <p>A new announcement has been made:</p>
                        <p><strong>Title:</strong> ${title}</p>
                        <p>${description}</p>
                        <p>Sincerely,<br>BAP E-Board</p>`
             
            }));
      
            // Send all emails in parallel
            const promises = messages.map(msg => sgMail.send(msg));
            await Promise.all(promises);
            
            console.log(`Successfully sent invitation emails to ${emailList.length} recipients`);
          } catch (error) {
            console.error('Error sending invitation emails:', error);
            if (error) {
              console.error('SendGrid API error:', error);
            }
            throw new Error('Failed to send invitation emails');
          }
        }

    async editannouncements(announcement_id: string, updateData: Record<string, string>) {
        const { error } = await this.supabase
            .from('announcements')
            .update(updateData)
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