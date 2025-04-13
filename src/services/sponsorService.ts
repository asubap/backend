import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";

export interface SponsorResource {
  url: string;
  label: string;
}

export class SponsorService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseClient();
  }

  setToken(token: string) {
    this.supabase = createSupabaseClient(token);
  }

  // Get sponsor info by company name
  async getSponsorInfo(companyName: string) {
    const { data, error } = await this.supabase
      .from('sponsor_info')
      .select('*')
      .eq('company_name', companyName)
      .single();

    if (error) throw error;
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
} 