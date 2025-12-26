import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";
import sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';

export interface SponsorResource {
  url: string;
  label: string;
  uploadDate: string; // ISO string format 
}

export class SponsorService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseClient();
    this.supabaseAdmin = createSupabaseClient(undefined, true);
  }

  setToken(token: string) {
    this.supabase = createSupabaseClient(token);
    this.supabaseAdmin = createSupabaseClient(undefined, true);
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

  //sending Emails
  async sendSponsorInvitations(sponsorName: string, tier: string, passcode: string, emailList: string[]): Promise<void> {
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
                <p>IMPORTANT!! Please keep this passcode secure as it grants access to your sponsor portal !!</p>
                <p>Best regards,<br>The ASU BAP Team</p>`
        }));
  
        // Send all emails in parallel
        const promises = messages.map(msg => sgMail.send(msg));
        await Promise.all(promises);
        
      } catch (error) {
        console.error('Error sending invitation emails:', error);
        if (error) {
          console.error('SendGrid API error:', error);
        }
        throw new Error('Failed to send invitation emails');
      }
    }

  // add a sponsor
  async addSponsor(sponsor: string, tier: string, passcode_hash: string, emails: string[]) {
      // Create user in auth.users
      let sponsor_email = sponsor;
      if (sponsor.split(' ').length > 1) {
        sponsor_email = sponsor.split(' ').join('-');
      }

      const emailToCreate = `${sponsor_email.toLowerCase()}@example.com`;

      // Ensure password meets minimum requirements
      if (passcode_hash.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      // Try to create user, if it fails due to existing user, get and delete them first
      let { data, error } = await this.supabaseAdmin.auth.admin.createUser({
        email: emailToCreate,
        password: passcode_hash,
        email_confirm: true, // Auto-confirm email
      })

      // If creation failed due to existing user, find and delete them, then retry
      if (error && error.message.includes('already')) {
        console.log("User already exists, attempting to find and delete...");

        try {
          const { data: existingUsers } = await this.supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === emailToCreate.toLowerCase());

          if (existingUser) {
            console.log("Found existing user with ID:", existingUser.id);
            console.log("Deleting from allowed_members (triggers will handle auth.users and sponsor_info cleanup)...");

            // Delete from allowed_members - triggers handle the rest (auth.users, sponsor_info, etc.)
            await this.supabaseAdmin.from('allowed_members').delete().eq('email', existingUser.email);

            console.log("Retrying user creation...");
            // Retry creation
            const retryResult = await this.supabaseAdmin.auth.admin.createUser({
              email: emailToCreate,
              password: passcode_hash,
              email_confirm: true,
            });

            data = retryResult.data;
            error = retryResult.error;
          }
        } catch (deleteErr) {
          console.error("Error during user cleanup:", deleteErr);
        }
      }
  
      if (error) {
          throw new Error(`Error creating user: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('User not found');
      }

      // add role to allowed_members table
      const { error: roleError } = await this.supabaseAdmin.from('allowed_members').insert({
        email: `${sponsor_email.toLowerCase()}@example.com`,
        role: 'sponsor',
      });

      // add sponsor to sponsor_info table
      const { error: sponsorError } = await this.supabaseAdmin.from('sponsor_info').insert({
        company_name: sponsor,
        emails: emails,
        uuid: data.user.id,
        tier: tier,
      });
  
      if (roleError) {
          throw new Error(`Error adding user to database: ${roleError.message}`);
      }

      if (sponsorError) {
          throw new Error(`Error adding sponsor to database: ${sponsorError.message}`);
      }

      return data;
  }

  // change sponsor tier
  async changeSponsorTier(sponsor_name: string, tier: string) {
    const { error: updateError } = await this.supabase
      .from('sponsor_info')
      .update({ tier: tier })
      .eq('company_name', sponsor_name);

    if (updateError) throw new Error(`Error changing sponsor tier: ${updateError.message}`);

    return {
      success: true,
      message: 'Sponsor tier changed successfully'
    }
  }

  // delete a sponsor
  async deleteSponsor(sponsor_name: string)
 {
    try {
      // replace spaces with - and add a @example.com to the email
      const email = sponsor_name.replace(/\s+/g, '-') + "@example.com";
      
      // Delete sponsor profile photo
      try {
        await this.deleteSponsorProfilePhoto(sponsor_name);
      } catch (error) {
        console.error("Error deleting sponsor profile photo:", error);
        // Continue with deletion even if photo deletion fails
      }

      console.log("email", email);
      
      // delete from allowed_members table
      const { error: allowedError } = await this.supabase
        .from('allowed_members')
        .delete()
        .eq('email', email);

      if (allowedError) throw new Error(`Error deleting allowed member: ${allowedError.message}`);
      
      // get category id 
      const { data: categoryData, error: fetchError } = await this.supabase
        .from('categories')
        .select('id')
        .eq('name', sponsor_name)
        .single();
      
      if (categoryData) {
        // Delete all files in the sponsor's folder - first list all files
        const { data: fileList, error: listError } = await this.supabase.storage
          .from('resources')
          .list(categoryData.id);
        
        if (listError) throw new Error(`Error listing files to delete: ${listError.message}`);
        
        // If there are files, delete them
        if (fileList && fileList.length > 0) {
          const filePaths = fileList.map(file => `${categoryData.id}/${file.name}`);
          const { error: removeError } = await this.supabase.storage
            .from('resources')
            .remove(filePaths);
            
          if (removeError) throw new Error(`Error removing files: ${removeError.message}`);
        }
       
        // delete from categories table
        const { error: categoryError } = await this.supabase
          .from('categories')
          .delete()
          .eq('name', sponsor_name);
        if (categoryError) throw new Error(`Error deleting category: ${categoryError.message}`);
      }
      
      // delete from sponsor_info table
      const { error: sponsorError } = await this.supabase
        .from('sponsor_info')
        .delete()
        .eq('company_name', sponsor_name);
      
      if (sponsorError) throw new Error(`Error deleting sponsor: ${sponsorError.message}`);
      
      return "Sponsor deleted successfully";
    } catch (error) {
      console.error('Error deleting sponsor:', error);
      throw error;
    }
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
    try {
      // Get all sponsors
      const { data: sponsors, error: sponsorError } = await this.supabase
        .from('sponsor_info')
        .select('*')
        .order('company_name');

      if (sponsorError) throw sponsorError;

      // For each sponsor, fetch their resources
      const result = await Promise.all(
        sponsors.map(async (sponsor) => {
          try {
            // Get resources for this sponsor
            const { data: resourceData, error: resourceError } = await this.supabase
              .from('resources')
              .select('*')
              .eq('category_id', (await this.getSponsorCategoryId(sponsor.company_name)))
              .order('name');

            if (resourceError) {
              console.warn(`Error fetching resources for sponsor ${sponsor.company_name}:`, resourceError);
              // Return sponsor with empty resources array
              return {
                ...sponsor,
                resources: []
              };
            }

                      // Map the resources to match frontend format
            const resourcesWithUrls = await Promise.all(
              resourceData.map(async (resource) => {
                let url = null;
                
                // Check if file_key is already a URL (Vercel Blob)
                if (resource.file_key && resource.file_key.startsWith('http')) {
                  // It's a Vercel Blob URL - use it directly
                  url = resource.file_key;
                } else {
                  // It's a Supabase path - generate signed URL
                  const { data: urlData } = await this.supabase.storage
                    .from('resources')
                    .createSignedUrl(resource.file_key, 60 * 60); // 1 hour expiry
                  url = urlData?.signedUrl || null;
                }

                // Return in frontend-expected format
                return {
                  id: resource.id,
                  label: resource.name, // Map name to label
                  url: url, // The actual file URL
                  uploadDate: resource.created_at
                };
              })
            );

            // Return sponsor with properly formatted resources
            return {
              ...sponsor,
              resources: resourcesWithUrls
            };
          } catch (error) {
            console.warn(`Error processing sponsor ${sponsor.company_name}:`, error);
            // Return sponsor with empty resources array if there's any error
            return {
              ...sponsor,
              resources: []
            };
          }
        })
      );

      return result;
    } catch (error) {
      console.error('Error fetching sponsors with resources:', error);
      throw error;
    }
  }

  // Helper method to get category ID for a sponsor
  private async getSponsorCategoryId(companyName: string): Promise<string | null> {
    const { data: category, error } = await this.supabase
      .from('categories')
      .select('id')
      .eq('name', companyName)
      .single();

    if (error || !category) {
      return null;
    }

    return category.id;
  }

  // Add a new resource for a sponsor
  async addSponsorResource(companyName: string, resourceLabel: string, description:string, file?: Express.Multer.File, blobUrl?: string) {
    try {
      // Either file or blobUrl must be provided
      if (!file && !blobUrl) {
        throw new Error('Either file or blobUrl must be provided');
      }

      // Get or create category for this sponsor
      let { data: categoryData, error: categoryError } = await this.supabase
        .from('categories')
        .select('id')
        .eq('name', companyName)
        .single();

      if (categoryError) {
        // Create category if it doesn't exist
        const { data: newCategory, error: createError } = await this.supabase
          .from('categories')
          .insert({ 
            name: companyName, 
            description: `These are all the resources for ${companyName}` 
          })
          .select('id')
          .single();

        if (createError) throw createError;
        categoryData = newCategory;
      }

      if (!categoryData) {
        throw new Error('Failed to get or create category for sponsor');
      }

      let fileKey: string;
      let mimeType: string;

      if (file) {
        // Handle file upload
        const filePath = `${categoryData.id}/${Date.now()}_${file.originalname}`;

        const { data: uploadData, error: uploadError } = await this.supabase.storage
          .from('resources')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (uploadError) throw uploadError;
        
        fileKey = filePath;
        mimeType = file.mimetype;
      } else if (blobUrl) {
        // Handle blob URL
        fileKey = blobUrl;
        mimeType = 'application/octet-stream'; // Default mime type for blob URLs
      } else {
        throw new Error('Either file or blobUrl must be provided');
      }

      const { data: resource, error: resourceError } = await this.supabase
        .from('resources')
        .insert({
          category_id: categoryData.id,
          name: resourceLabel,
          description: description,
          file_key: fileKey,
          mime_type: mimeType
        })
        .select()
        .single();

      if (resourceError) {
        // If resource creation fails and we uploaded a file, try to delete it
        if (file) {
          console.log(`DEBUG - addResource: Resource creation failed, cleaning up uploaded file`);
          await this.supabase.storage.from('resources').remove([fileKey]);
        }
        throw resourceError;
      }

      // Generate a signed URL for immediate use (only for Supabase storage files)
      let signedUrl = null;
      if (file) {
        const { data: urlData, error: urlError } = await this.supabase.storage
          .from("resources")
          .createSignedUrl(fileKey, 60 * 60); // 1 hour expiry

        signedUrl = urlData?.signedUrl || null;
      }

      const result = {
        ...resource,
        signed_url: signedUrl
      };
      
      return result;
    } catch (error) {
      console.error('Error adding sponsor resource:', error);
      throw error;
    }
  }

  // Get all resources for a sponsor with parsed labels
  async getSponsorResources(companyName: string) {
    try {
      const { data: categoryData, error } = await this.supabase
        .from('categories')
        .select('id')
        .eq('name', companyName)
        .single();
      if (error) throw error;

      if (!categoryData) {
        return [];
      }
      // Fetch resources for the given category
      const { data: resourceData, error: fetchError } = await this.supabase
        .from('resources')
        .select('*')
        .eq('category_id', categoryData.id);
      if (fetchError) throw fetchError;
      if (!resourceData) {
        return [];
      }
      // Map the resources to include the signed URL
      const resourcesWithUrls = await Promise.all(
        resourceData.map(async (resource) => {
          let signedUrl = null;
          
          // Check if file_key is already a URL (Vercel Blob)
          if (resource.file_key && resource.file_key.startsWith('http')) {
            // It's a Vercel Blob URL - use it directly
            signedUrl = resource.file_key;
          } else {
            // It's a Supabase path - generate signed URL
            const { data: urlData } = await this.supabase.storage
              .from('resources')
              .createSignedUrl(resource.file_key, 60 * 60); // 1 hour expiry
            signedUrl = urlData?.signedUrl || null;
          }

          return {
            ...resource,
            signed_url: signedUrl
          };
        })
      );
      //return all results 
      const results = resourcesWithUrls.map((res) => {
        return {
          url: res.signed_url,
          label: res.name,
          description: res.description,
          uploadDate: res.created_at
        } as SponsorResource;
      })
      return results;

    
      
    } catch (error) {
      console.error('Error getting sponsor resources:', error);
      throw error;
    }
  }

  // Delete a sponsor resource
  async deleteSponsorResource(companyName: string, resourceUrl: string) {
    try {
      // Get current category ID for the company 
      const { data: categoryData, error } = await this.supabase
        .from('categories')
        .select('id')
        .eq('name', companyName)
        .single();
      if (error) throw error;

      if (!categoryData ) {
        throw new Error('Sponsor category not found');
      }
      //get all entries that match the category id
      const { data: resourceData, error: fetchError } = await this.supabase
        .from('resources')
        .select('*')
        .eq('category_id', categoryData.id);
      if (fetchError) throw fetchError;
      if (!resourceData) {
        return [];
      }
      const urlParts = resourceUrl.split('/');
      let filePath = urlParts.slice(-2).join('/');
      
      // Remove any query parameters (everything after '?')
      filePath = filePath.split('?')[0];
      
      // Find the resource to delete based on the resourceUrl 
      // Decode the URL-encoded filePath to handle spaces (%20)
      const resourceToDelete = resourceData.find(res => res.file_key === decodeURIComponent(filePath));
      if (!resourceToDelete) {
        throw new Error('Resource not found');
      }
      // Extract the path from the URL to delete from storage
     
      // Delete from storage bucket
      const { error: storageError } = await this.supabase.storage
        .from('resources')
        .remove([resourceToDelete.file_key]);
      if (storageError) throw storageError;
      //delete from resources table
      const { error: deleteError } = await this.supabase
        .from('resources')
        .delete()
        .eq('file_key', resourceToDelete.file_key);
      if (deleteError) throw deleteError;
     



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
            // Find the index of profile-photos bucket in the URL
            const bucketIndex = urlParts.indexOf('profile-photos');
            if (bucketIndex !== -1 && bucketIndex + 1 < urlParts.length) {
                // Everything after 'profile-photos' is our file path
                const filePath = urlParts.slice(bucketIndex + 1).join('/');
                
                // The remove function expects an array of paths
                const { error: pfpError } = await this.supabase.storage
                  .from('profile-photos')
                  .remove([filePath]); // Pass as array, not single string
                
                if (pfpError) {
                  console.error("Error deleting profile photo:", pfpError);
                  throw pfpError;
                }
            } else {
              console.warn("Could not parse profile photo path for deletion:", photoUrl);
            }
        } catch (removeError) {
            console.error("Error removing profile photo from storage:", removeError);
            // Continue to update the database even if file deletion fails
        }
      }

      // Clear the photo URL in the database - moved after file deletion attempt
      const { error: updateError } = await this.supabase
        .from('sponsor_info')
        .update({ pfp_url: null })
        .eq('company_name', companyName);

      if (updateError) throw updateError;
     
      return {
          success: true,
          message: photoUrl ? 'Profile photo deleted successfully.' : 'No profile photo found to delete.'
      };
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

}
