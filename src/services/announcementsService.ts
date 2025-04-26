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
        //adding announcement to the announcements table
        try{
            const { data: announcementData, error: aError } = await this.supabase
                .from('announcements')
                .insert(
                    {
                        title: title,
                        description: description
                    });
                if (aError) throw aError;
            
            console.log(announcementData);
            return ("Announcement added successfully");
         
            
        }
        catch (error) {
            console.error('Error adding announcement:', error);
            throw new Error('Failed to add announcement');
        }


    
      
    }

    async getUsersEmails(title: string, description: string){
        try{
                //getting allMemberEmails except for sponsors 
            const { data: allMemberEmails, error: eError } = await this.supabase
                .from('allowed_members')
                .select('email')
                .neq('role', 'sponsor');
            if (eError) throw eError;
            console.log("Member Emails:", allMemberEmails);
            //getting all sponsors emails
            const { data: allSponsorEmails, error: sError } = await this.supabase
                .from('sponsor_info')
                .select('emails');
                
            if (sError) throw sError;
            console.log("Sponsor Emails:", allSponsorEmails);
            //combining all emails to one unique list of emails 
            const emailsFromMembers = allMemberEmails.map(member => member.email);
            const emailsFromSponsors = allSponsorEmails.flatMap(sponsor => sponsor.emails);
            const combinedEmails = [...emailsFromMembers, ...emailsFromSponsors];
            const uniqueEmails = [...new Set(combinedEmails)];
            console.log("Unique Emails:", uniqueEmails);
            return uniqueEmails;
        }
        catch (error) {
            console.error('Error fetching emails:', error);
            throw new Error('Failed to fetch emails');
        }
    }

    async sendAnnouncments(emailList: string[], title: string, description: string): Promise<void> {
          try {
            // Create email messages for each recipient
            const messages = emailList.map(email => ({
              to: email,
              from: process.env.SENDGRID_FROM_EMAIL || 'your-verified-sender@example.com', // Use a verified sender
              subject: `New Announcement: ${title}`,
              text: `Hello,\n\nA new announcement has been made:\n\nTitle: ${title}\nDescription: ${description}\n\nBest regards,\nThe Team`,
                html: `<p>Hello,</p>
                        <p>A new announcement has been made:</p>
                        <p><strong>Title:</strong> ${title}</p>
                        <p><strong>Description:</strong> ${description}</p>
                        <p>Best regards,<br>The Team</p>`
             
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
        const { data, error } = await this.supabase
            .from('announcements')
            .update(updateData)
            .eq('id', announcement_id);

        if (error) throw error;
        return "Updated announcement";
    }

    async deleteannouncements(announcement_id: string) {
        const { data, error } = await this.supabase
            .from('announcements')
            .delete()
            .eq('id', announcement_id);

        if (error) throw error;
        return "Deleted announcement";
    }
}