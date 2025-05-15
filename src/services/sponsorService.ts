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
     //delete sponsorProfile photo using method 
    this.deleteSponsorProfilePhoto(sponsor_name).then(() => {
      console.log("Sponsor profile photo deleted successfully");
    }).catch((error) => {
      console.error("Error deleting sponsor profile photo:", error);
    });
    // delete from allowed_members table
    const { error: allowedError } = await this.supabase
    .from('allowed_members')
    .delete()
    .eq('email', sponsor_name.toLowerCase() + "@example.com");

    if (allowedError) throw new Error(`Error deleting allowed member: ${allowedError.message}`);
    // get category id 
    const { data: categoryData, error: fetchError } = await this.supabase
    .from('categories')
    .select('id')
    .eq('name', sponsor_name)
    .single();
    if (fetchError) throw new Error(`Error fetching category ID: ${fetchError.message}`);

    // Delete all files in the sponsor's folder - first list all files
    const { data: fileList, error: listError } = await this.supabase.storage
      .from('resources')
      .list(categoryData.id);
    
    if (listError) throw new Error(`Error listing files to delete: ${listError.message}`);
    console.log("Files to delete:", fileList);
    // If no files found, return early
    if (!fileList || fileList.length === 0) {
      console.log("No files found to delete.");
      throw new Error("No files found to delete.");
    }
    // If there are files, delete them
    if (fileList && fileList.length > 0) {
      const filePaths = fileList.map(file => `${categoryData.id}/${file.name}`);
      console.log("File paths to delete:", filePaths);
      if (filePaths.length === 0) {
        console.log("No files to delete.");
        throw new Error("No files to delete.");
      }
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
    
    
    return "Sponsor deleted successfully";
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
   
      //Adding Company as a category 
      const { data, error } = await this.supabase
        .from('categories')
        .insert({ name: companyName, description: `These are all the resources for ${companyName}` })
        .select()
        .single();
      //ISSUE 
      const { data: categoryData, error: categoryError } = await this.supabase
      .from('categories')
      .select('id')
      .eq('name', companyName)
      .single();
      const filePath = `${categoryData?.id}/${Date.now()}_${file.originalname}`;

      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('resources')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) throw uploadError;
      console.log(uploadData);
      console.log(categoryData);
      const { data: resource, error: resourceError } = await this.supabase
        .from('resources')
        .insert({
          category_id: categoryData?.id,
          name: resourceLabel,
          description: ``,
          file_key: filePath,
          mime_type: file.mimetype,
        })
        .select()
        .single();

      
      
      if (resourceError) {
        // If resource creation fails, try to delete the uploaded file
        console.log(`DEBUG - addResource: Resource creation failed, cleaning up uploaded file`);
        await this.supabase.storage.from('resources').remove([filePath]);
        throw resourceError;
      }

      // Generate a signed URL for immediate use
    
      const { data: urlData, error: urlError } = await this.supabase.storage
        .from("resources")
        .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

      console.log(`DEBUG - addResource: Signed URL result:`, { data: urlData, error: urlError });
      
      const result = {
        ...resource,
        signed_url: urlData?.signedUrl || null
      };
      
      console.log(`DEBUG - addResource: Successfully completed`);
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
      console.log(categoryData)
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
      console.log(resourceData)
      if (!resourceData) {
        return [];
      }
      // Map the resources to include the signed URL
      const resourcesWithUrls = await Promise.all(
        resourceData.map(async (resource) => {
          const { data: urlData } = await this.supabase.storage
            .from('resources')
            .createSignedUrl(resource.file_key, 60 * 60); // 1 hour expiry

          return {
            ...resource,
            signed_url: urlData?.signedUrl || null
          };
        })
      );
      //return all results 
      const results = resourcesWithUrls.map((res) => {
        return {
          url: res.signed_url,
          label: res.name,
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
      console.log(categoryData)
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
      console.log("Resource data", resourceData)
      if (!resourceData) {
        return [];
      }
      const urlParts = resourceUrl.split('/');
      let filePath = urlParts.slice(-2).join('/');
      
      // Remove any query parameters (everything after '?')
      filePath = filePath.split('?')[0];
      
      console.log(filePath)
      console.log(urlParts)
      // Find the resource to delete based on the resourceUrl 
      // Decode the URL-encoded filePath to handle spaces (%20)
      const resourceToDelete = resourceData.find(res => res.file_key === decodeURIComponent(filePath));
      console.log("The Resource to delete", resourceToDelete)
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
                console.log(`Attempting to delete file: ${filePath}`);
                
                // The remove function expects an array of paths
                const { error: pfpError } = await this.supabase.storage
                  .from('profile-photos')
                  .remove([filePath]); // Pass as array, not single string
                
                if (pfpError) {
                  console.error("Error deleting profile photo:", pfpError);
                  throw pfpError;
                }
                console.log("Successfully deleted profile photo from storage");
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
