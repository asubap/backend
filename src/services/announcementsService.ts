import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";

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

    async addannouncements(user_id: string, title: string, description: string) {
        const { data, error } = await this.supabase
            .from('announcements')
            .insert(
                {
                    title: title,
                    body: description,
                });
            if (error) throw error;
        console.log(data);

        
        //gotta use sendgrid for this 
        // try {
        //     // Create email messages for each recipient
        //     const messages = emailList.map(email => ({
        //         to: email,
        //         from: process.env.SENDGRID_FROM_EMAIL || 'your-verified-sender@example.com', // Use a verified sender
        //         subject: `You've been invited to ${sponsorName}'s sponsor portal`,
        //         text: `Hello,\n\nYou have been added as an authorized user for ${sponsorName}'s sponsor portal. You can now access the portal using your email and the following passcode:\n\nPasscode: ${passcode}\n\nPlease keep this passcode secure as it grants access to your sponsor portal.\n\nBest regards,\nThe Team`,
        //         html: `<p>Hello,</p>
        //             <p>You have been added as an authorized user for <strong>${sponsorName}'s</strong> sponsor portal.</p>
        //             <p>You can now access the portal using your email and the following passcode:</p>
        //             <p style="font-size: 16px; background-color: #f0f0f0; padding: 10px; border-radius: 5px;"><strong>Passcode: ${passcode}</strong></p>
        //             <p>Please keep this passcode secure as it grants access to your sponsor portal.</p>
        //             <p>Best regards,<br>The Team</p>`
        //     }));
        
        //     // Send all emails in parallel
        //     const promises = messages.map(msg => sgMail.send(msg));
        //     await Promise.all(promises);
            
        //     console.log(`Successfully sent invitation emails to ${emailList.length} recipients`);
        //       } catch (error) {
        //         console.error('Error sending invitation emails:', error);
        //         if (error) {
        //           console.error('SendGrid API error:', error);
        //         }
        //         throw new Error('Failed to send invitation emails');
        //       }
        if (error) console.log(error);
        return data;
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