import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";
import sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';

export interface SponsorResource {
  url: string;
  label: string;
}

export class SponsorService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseClient();
    this.supabaseAdmin = createSupabaseClient(process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
  }

  setToken(token: string) {
    this.supabase = createSupabaseClient(token);
    this.supabaseAdmin = createSupabaseClient(process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
  }

  // get sponsor names
  async getSponsorNames() {
    try {
      const { data, error } = await this.supabase
        .from('sponsor_info')
        .select('company_name');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching sponsor names:', error);
      throw error;
    }
  }
  //get all sponsors
  async getSponsorsAll() {
    try {
      const { data, error } = await this.supabase
        .from('sponsor_info')
        .select('*');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      throw error;
    }
  }

  //sending Emails
  async sendSponsorInvitations(sponsorName: string, passcode: string, emailList: string[]): Promise<void> {
      try {
        // Create email messages for each recipient
        const messages = emailList.map(email => ({
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL || 'your-verified-sender@example.com', // Use a verified sender
          subject: `You've been invited to ${sponsorName}'s sponsor portal`,
          text: `Hello,\n\nYou have been added as an authorized user for ${sponsorName}'s sponsor portal. You can now access the portal using your email and the following passcode:\n\nPasscode: ${passcode}\n\nPlease keep this passcode secure as it grants access to your sponsor portal.\n\nBest regards,\nThe Team`,
          html: `<p>Hello,</p>
                <p>You have been added as an authorized user for <strong>${sponsorName}'s</strong> sponsor portal.</p>
                <p>You can now access the portal using your email and the following passcode:</p>
                <p style="font-size: 16px; background-color: #f0f0f0; padding: 10px; border-radius: 5px;"><strong>Passcode: ${passcode}</strong></p>
                <p>Please keep this passcode secure as it grants access to your sponsor portal.</p>
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

  // add a sponsor
  async addSponsor(sponsor: string, passcode_hash: string, emails: string[]) {
      // Create user in auth.users
      const { data, error } = await this.supabaseAdmin.auth.signUp({
        email: `${sponsor}@example.com`,
        password: passcode_hash,
      })

      if (!data.user) {
        throw new Error('User not found');
      }
  
      if (error) {
          throw new Error(`Error creating user: ${error.message}`);
      }

      // add role to allowed_members table
      const { error: roleError } = await this.supabaseAdmin.from('allowed_members').insert({
        email: `${sponsor.toLowerCase()}@example.com`,
        role: 'sponsor',
      });

      // add sponsor to sponsor_info table
      const { error: sponsorError } = await this.supabaseAdmin.from('sponsor_info').insert({
        company_name: sponsor,
        emails: emails,
        uuid: data.user.id,
      });
  
      if (roleError) {
          throw new Error(`Error adding user to database: ${roleError.message}`);
      }

      return data;
  }

  // delete a sponsor
  async deleteSponsor(sponsor_name: string) {
    // get uuid from sponsor_info table
    const { data: uuidData, error: uuidError } = await this.supabaseAdmin.from('sponsor_info').select('uuid').eq('company_name', sponsor_name).single();
    if (uuidError) throw new Error(`Error fetching uuid: ${uuidError.message}`);

    // delete user from auth.users
    const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.deleteUser(uuidData.uuid);

    if (authError) {
        throw new Error(`Error deleting user: ${authError.message}, ${authError.code}, ${uuidData.uuid}`);
    }

    // delete from allowed_members table
    const { error: allowedError } = await this.supabaseAdmin.from('allowed_members').delete().eq('email', sponsor_name.toLowerCase() + "@example.com");
    if (allowedError) throw new Error(`Error deleting allowed member: ${allowedError.message}`);

    const { data, error } = await this.supabaseAdmin.from('sponsor_info').delete().eq('company_name', sponsor_name);

    if (error) throw new Error(`Error deleting sponsor: ${error.message}, ${uuidData.uuid}`);
    return data;
  }

  // Get sponsor info by passcode
  async getSponsorByName(sponsor_name: string) {
      const { data, error } = await this.supabase
        .from('sponsor_info')
        .select('*')
        .eq('company_name', sponsor_name) // if plain, insecure
        .single()
    
      if (error) return null
    
      
    
      return data;
  }


  // Get all sponsors
  async getAllSponsors() {
    const { data, error } = await this.supabase
      .from('sponsor_info')
      .select('*');

    if (error) throw error;
    return data;
  }

  // Add a new resource for a sponsor
  async addSponsorResource(companyName: string, resourceLabel: string, file: Express.Multer.File) {
    try {
      // First upload the file to the storage bucket
      const filePath = `${companyName}/${Date.now()}_${file.originalname}`;
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('sponsor-resources')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Generate the public URL for the uploaded file
      const { data: publicUrlData } = await this.supabase.storage
        .from('sponsor-resources')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Get current resources array
      const { data: sponsorData, error: fetchError } = await this.supabase
        .from('sponsor_info')
        .select('resources')
        .eq('company_name', companyName)
        .single();

      if (fetchError) throw fetchError;

      // Parse the current resources
      let currentResources: SponsorResource[] = [];
      if (sponsorData && Array.isArray(sponsorData.resources)) {
        currentResources = sponsorData.resources.map((res: string) => {
          try {
            return JSON.parse(res) as SponsorResource;
          } catch (e) {
            return { url: res, label: res };
          }
        });
      }

      // Add the new resource
      const newResource: SponsorResource = {
        url: publicUrl,
        label: resourceLabel
      };

      const updatedResources = [...currentResources, newResource];

      // Update the sponsor_info table with the new resources array
      const { data: updateData, error: updateError } = await this.supabase
        .from('sponsor_info')
        .update({
          resources: updatedResources.map(resource => JSON.stringify(resource))
        })
        .eq('company_name', companyName);

      if (updateError) throw updateError;

      return {
        success: true,
        resource: newResource
      };
    } catch (error) {
      console.error('Error adding sponsor resource:', error);
      throw error;
    }
  }

  // Get all resources for a sponsor with parsed labels
  async getSponsorResources(companyName: string) {
    try {
      const { data, error } = await this.supabase
        .from('sponsor_info')
        .select('resources')
        .eq('company_name', companyName)
        .single();

      if (error) throw error;

      if (!data || !Array.isArray(data.resources)) {
        return [];
      }

      // Parse the resources to get the URLs and labels
      const resources: SponsorResource[] = data.resources.map((res: string) => {
        try {
          return JSON.parse(res) as SponsorResource;
        } catch (e) {
          return { url: res, label: res };
        }
      });

      return resources;
    } catch (error) {
      console.error('Error getting sponsor resources:', error);
      throw error;
    }
  }

  // Delete a sponsor resource
  async deleteSponsorResource(companyName: string, resourceUrl: string) {
    try {
      // Get current resources
      const { data: sponsorData, error: fetchError } = await this.supabase
        .from('sponsor_info')
        .select('resources')
        .eq('company_name', companyName)
        .single();

      if (fetchError) throw fetchError;

      if (!sponsorData || !Array.isArray(sponsorData.resources)) {
        throw new Error('Sponsor resources not found');
      }

      // Parse the resources
      const resources: SponsorResource[] = sponsorData.resources.map((res: string) => {
        try {
          return JSON.parse(res) as SponsorResource;
        } catch (e) {
          return { url: res, label: res };
        }
      });

      // Find the resource to delete
      const resourceToDelete = resources.find(res => res.url === resourceUrl);
      if (!resourceToDelete) {
        throw new Error('Resource not found');
      }

      // Extract the path from the URL to delete from storage
      const urlParts = resourceUrl.split('/');
      const filePath = urlParts.slice(-2).join('/');

      // Delete from storage bucket
      const { error: storageError } = await this.supabase.storage
        .from('sponsor-resources')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Update the resources array without the deleted resource
      const updatedResources = resources.filter(res => res.url !== resourceUrl);

      // Update the sponsor_info table
      const { error: updateError } = await this.supabase
        .from('sponsor_info')
        .update({
          resources: updatedResources.map(resource => JSON.stringify(resource))
        })
        .eq('company_name', companyName);

      if (updateError) throw updateError;

      return {
        success: true,
        message: 'Resource deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting sponsor resource:', error);
      throw error;
    }
  }

  // Upload or update sponsor profile photo
  async uploadSponsorProfilePhoto(companyName: string, file: Express.Multer.File) {
    try {
      // Check if sponsor exists
      const { data: sponsorData, error: fetchError } = await this.supabase
        .from('sponsor_info')
        .select('pfp_url')
        .eq('company_name', companyName)
        .single();

      if (fetchError || !sponsorData) {
        throw new Error(fetchError?.message || 'Sponsor not found');
      }

      // Delete the old photo if it exists
      const oldPhotoUrl = sponsorData.pfp_url;
      if (oldPhotoUrl) {
        try {
          const urlParts = oldPhotoUrl.split('/');
          // Ensure we have enough parts and check the base structure
          if (urlParts.length > 7 && urlParts[6] === 'sponsors') { 
            const oldFilePath = urlParts.slice(6).join('/'); // Path like 'sponsors/companyName/filename'
            await this.supabase.storage.from('profile-photos').remove([oldFilePath]);
          } else {
            console.warn("Could not parse old profile photo path for deletion:", oldPhotoUrl);
          }
        } catch (removeError) {
          console.error("Error removing old profile photo:", removeError);
          // Continue with upload even if deletion fails
        }
      }

      // Upload the new photo
      const filePath = `sponsors/${companyName}/${Date.now()}_${file.originalname}`;
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('profile-photos') 
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false // Don't upsert, we handle deletion separately
        });

      if (uploadError) throw uploadError;

      // Generate the public URL for the uploaded file
      const { data: publicUrlData } = this.supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Update the sponsor_info table with the new photo URL
      const { error: updateError } = await this.supabase
        .from('sponsor_info')
        .update({ pfp_url: publicUrl })
        .eq('company_name', companyName);

      if (updateError) throw updateError;

      return {
        success: true,
        photoUrl: publicUrl
      };
    } catch (error) {
      console.error('Error uploading sponsor profile photo:', error);
      throw error;
    }
  }

  // Delete sponsor profile photo
  async deleteSponsorProfilePhoto(companyName: string) {
    try {
      // Get the current photo URL
      const { data: sponsorData, error: fetchError } = await this.supabase
        .from('sponsor_info')
        .select('pfp_url')
        .eq('company_name', companyName)
        .single();

      if (fetchError || !sponsorData) {
        throw new Error(fetchError?.message || 'Sponsor not found');
      }

      const photoUrl = sponsorData.pfp_url;
      if (photoUrl) {
        try {
            const urlParts = photoUrl.split('/');
             // Ensure we have enough parts and check the base structure
            if (urlParts.length > 7 && urlParts[6] === 'sponsors') {
                const filePath = urlParts.slice(6).join('/'); // Path like 'sponsors/companyName/filename'
                await this.supabase.storage.from('profile-photos').remove([filePath]);
            } else {
              console.warn("Could not parse profile photo path for deletion:", photoUrl);
            }
        } catch (removeError) {
            console.error("Error removing profile photo from storage:", removeError);
             // Still attempt to clear the DB link
        }

        // Clear the photo URL in the database
        const { error: updateError } = await this.supabase
          .from('sponsor_info')
          .update({ pfp_url: null })
          .eq('company_name', companyName);

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
      console.error('Error deleting sponsor profile photo:', error);
      throw error;
    }
  }

  /**
   * Update sponsor details (about, links)
   * @param companyName - The company name to identify the sponsor (passed directly now)
   * @param updateData - An object containing the fields to update (e.g., { about?: string, links?: string[] })
   */
  async updateSponsorDetails(companyName: string, updateData: { about?: string; links?: string[] }) {
    try {
      // Validation logic for updateData remains the same
      if (Object.keys(updateData).length === 0) {
        throw new Error("No update data provided.");
      }
      if (updateData.links !== undefined && !Array.isArray(updateData.links)) {
        throw new Error("Links must be an array of strings.");
      }
      if (updateData.links?.some(link => typeof link !== 'string')) {
           throw new Error("All items in the links array must be strings.");
      }
      if (updateData.about !== undefined && typeof updateData.about !== 'string') {
          throw new Error("About must be a string.");
      }

      // Remove the lookup via passcode_hash
      // const { data: creds, error: credsError } = await this.supabase
      //   .from('sponsors_creds')
      //   .select('sponsor')
      //   .eq('passcode_hash', passcode_hash)
      //   .single();
      // if (credsError || !creds) {
      //   console.error('Error finding sponsor credentials:', credsError);
      //   throw new Error('Sponsor not found');
      // }

      // Update sponsor_info directly using the provided companyName
      const { data, error } = await this.supabase
        .from('sponsor_info')
        .update(updateData)
        .eq('company_name', companyName) // Use companyName directly
        .select() 
        .single();

      if (error) {
          if (error.code === 'PGRST116' && error.details.includes('0 rows')) {
              throw new Error(`Sponsor with company name '${companyName}' not found.`);
          }
          throw error;
      }

      return {
        success: true,
        message: 'Sponsor details updated successfully.',
        updatedSponsor: data
      };
    } catch (error) {
      console.error('Error updating sponsor details:', error);
      throw error;
    }
  }

  // async sponsorAuth(companyName: string, passcode: string) {
  //   // get passcode_hash from sponsors_creds table
  //   const { data: creds, error: credsError } = await this.supabase
  //     .from('sponsors_creds')
  //     .select('passcode_hash')
  //     .eq('sponsor', companyName) // Convert companyName to lowercase for case-insensitive matching
  //     .single();

  //   if (credsError || !creds) {
  //     throw new Error('Invalid company name or passcode');
  //   }

  //   // return passcode_hash
  //   return creds.passcode_hash;
  // }
} 