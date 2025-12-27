import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/db";

export class ResourceService {
  private supabase: SupabaseClient;
  private readonly BUCKET_NAME = 'resources';

  constructor() {
    this.supabase = createSupabaseClient();
  }

  setToken(token: string) {
    this.supabase = createSupabaseClient(token);
  }

  /**
   * Get all categories with their resources
   * @returns A tree of categories and their resources
   */
  async getAllResources() {
    try {
      // Use optimized view that includes resources
      const { data: categories, error: categoryError } = await this.supabase
        .from('categories_with_resources')
        .select('*');

      if (categoryError) throw categoryError;

      // Generate signed URLs for each resource
      const result = await Promise.all(
        categories.map(async (category) => {
          // Parse resources JSON array
          const resources = Array.isArray(category.resources) ? category.resources : [];

          // Generate signed URLs for each resource file
          const resourcesWithUrls = await Promise.all(
            resources.map(async (resource: any) => {
              let signedUrl = null;

              // If file_key is already a URL, use it directly
              if (resource.file_key && resource.file_key.startsWith('http')) {
                signedUrl = resource.file_key;
              } else {
                // It's a Supabase storage path, generate signed URL
                const { data: urlData } = await this.supabase.storage
                  .from(this.BUCKET_NAME)
                  .createSignedUrl(resource.file_key, 60 * 60); // 1 hour expiry
                signedUrl = urlData?.signedUrl || null;
              }

              return {
                ...resource,
                signed_url: signedUrl
              };
            })
          );

          return {
            id: category.id,
            name: category.name,
            description: category.description,
            created_at: category.created_at,
            resource_type: category.resource_type,
            resources: resourcesWithUrls
          };
        })
      );

      return result;
    } catch (error) {
      console.error('Error fetching resources:', error);
      throw error;
    }
  }

  /**
   * Add a new category
   * @param name Category name
   * @param description Category description
   * @returns The newly created category
   */
  async addCategory(name: string, description: string, resourceType: string) {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .insert([
          {
            name: name,
            description: description,
            resource_type: resourceType 
          }
        ])
        .select()
        .single();
  
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }
  

  /**
   * Update an existing category
   * @param categoryId ID of category to update
   * @param updateData Object containing name and/or description
   * @returns The updated category
   */
  async updateCategory(categoryId: string, updateData: { name?: string; description?: string, resourceType?: string }) {
    try {
      //checking if it matches a sponsor name from sponsor-info table if so then dont let it succeed
      const { data: categoryCheck, error: categoryError } = await this.supabase
        .from('categories')
        .select('id, name')
        .eq('id', categoryId)
        .single();
      if (categoryError) {
        throw new Error(`Category with ID ${categoryId} not found`);
      }

      
      const { data: sponsorCheck, error: sponsorError } = await this.supabase
        .from('sponsor_info')
        .select('id, company_name')
        .eq('company_name', categoryCheck.name)
        .single();
      //basically if sponsorCheck is not null then it means that the category name is a sponsor name and we dont want to update it
      // so we will throw an error
      if (sponsorCheck && updateData.name != categoryCheck.name) {
        console.log(`DEBUG - updateCategory: Category name matches a sponsor name`, sponsorError);
        throw new Error(`Category name matches a sponsor name`);
      }

      console.log(updateData.resourceType)

      const { data, error } = await this.supabase
        .from('categories')
        .update({
          name: updateData.name,
          description: updateData.description,
          resource_type: updateData.resourceType
        })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  /**
   * Delete a category
   * @param categoryId ID of category to delete
   * @returns Success message
   */
  async deleteCategory(categoryId: string) {
    try {
      // Get all resources for this category to delete files
      const { data: resources, error: fetchError } = await this.supabase
        .from('resources')
        .select('file_key')
        .eq('category_id', categoryId);

      if (fetchError) throw fetchError;

      // Delete files from storage if they exist
      if (resources && resources.length > 0) {
        const filesToDelete = resources.map(resource => resource.file_key);
        const { error: storageError } = await this.supabase.storage
          .from(this.BUCKET_NAME)
          .remove(filesToDelete);

        if (storageError) {
          console.error('Error deleting resource files:', storageError);
          // Continue with category deletion even if file deletion fails
        }
      }

      // Delete the category (will automatically delete resource records via CASCADE)
      const { error } = await this.supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      return { success: true, message: 'Category and all its resources deleted successfully' };
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  /**
   * Add a resource to a category
   * @param categoryId ID of the category to add resource to
   * @param name Resource name
   * @param description Resource description
   * @param file File to upload (optional if blobUrl is provided)
   * @param blobUrl Blob URL for large files (optional if file is provided)
   * @returns The newly created resource
   */
  async addResource(categoryId: string, name: string, description: string, file?: Express.Multer.File, blobUrl?: string) {
    try {
      console.log(`DEBUG - addResource: Starting with categoryId=${categoryId}, name=${name}`);
      
      // Check if category exists
      console.log(`DEBUG - addResource: Checking if category exists`);
      const { data: categoryCheck, error: categoryError } = await this.supabase
        .from('categories')
        .select('id, name')
        .eq('id', categoryId)
        .single();

      console.log(`DEBUG - addResource: Category check result:`, { data: categoryCheck, error: categoryError });
      
      if (categoryError) {
        console.log(`DEBUG - addResource: Category not found`, categoryError);
        throw new Error(`Category with ID ${categoryId} not found`);
      }

      let fileKey: string;
      let mimeType: string;

      if (file) {
        // Handle file upload
        console.log(`DEBUG - addResource: File info: name=${file.originalname}, size=${file.size}, type=${file.mimetype}`);
        
        // Generate a unique file path
        const timestamp = Date.now();
        const fileName = `${categoryCheck.id}/${Date.now()}_${file.originalname}`;
        console.log(`DEBUG - addResource: Generated filename: ${fileName}`);

        // Upload file to storage
        console.log(`DEBUG - addResource: Uploading file to storage bucket: ${this.BUCKET_NAME}`);
        const { data: uploadData, error: uploadError } = await this.supabase.storage
          .from(this.BUCKET_NAME)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        console.log(`DEBUG - addResource: File upload result:`, { data: uploadData, error: uploadError });
        
        if (uploadError) {
          console.log(`DEBUG - addResource: File upload failed`, uploadError);
          throw uploadError;
        }

        fileKey = fileName;
        mimeType = file.mimetype;
      } else if (blobUrl) {
        // Handle blob URL
        console.log(`DEBUG - addResource: Using blob URL: ${blobUrl}`);
        
        // Store the blob URL in file_key
        fileKey = blobUrl;
        mimeType = 'application/octet-stream'; // Default mime type for blob URLs
      } else {
        throw new Error('Either file or blobUrl must be provided');
      }

      // Create resource record in database
      console.log(`DEBUG - addResource: Creating resource record in database`);
      const resourceData = {
        category_id: categoryId,
        name,
        description,
        file_key: fileKey,
        mime_type: mimeType
      };
      console.log(`DEBUG - addResource: Resource data to insert:`, resourceData);
      
      const { data: resource, error: resourceError } = await this.supabase
        .from('resources')
        .insert(resourceData)
        .select()
        .single();

      console.log(`DEBUG - addResource: Resource insert result:`, { data: resource, error: resourceError });
      
      if (resourceError) {
        // If resource creation fails and we uploaded a file, try to delete it
        if (file) {
          console.log(`DEBUG - addResource: Resource creation failed, cleaning up uploaded file`);
          await this.supabase.storage.from(this.BUCKET_NAME).remove([fileKey]);
        }
        throw resourceError;
      }

      // Generate a signed URL for immediate use (only for Supabase storage files)
      let signedUrl = null;
      if (file) {
        console.log(`DEBUG - addResource: Generating signed URL`);
        const { data: urlData, error: urlError } = await this.supabase.storage
          .from(this.BUCKET_NAME)
          .createSignedUrl(fileKey, 60 * 60); // 1 hour expiry

        console.log(`DEBUG - addResource: Signed URL result:`, { data: urlData, error: urlError });
        signedUrl = urlData?.signedUrl || null;
      }
      
      const result = {
        ...resource,
        signed_url: signedUrl
      };
      
      console.log(`DEBUG - addResource: Successfully completed`);
      return result;
    } catch (error) {
      console.error('Error adding resource:', error);
      throw error;
    }
  }

  /**
   * Update a resource
   * @param categoryId ID of the category
   * @param resourceId ID of the resource to update
   * @param updateData Object containing name and/or description
   * @param file Optional new file to replace existing one
   * @returns The updated resource
   */
  async updateResource(
    categoryId: string,
    resourceId: string,
    updateData: { name?: string; description?: string },
    file?: Express.Multer.File
  ) {
    try {
      // Get the current resource
      const { data: resource, error: fetchError } = await this.supabase
        .from('resources')
        .select('*')
        .eq('id', resourceId)
        .eq('category_id', categoryId)
        .single();
      
      const {data: category, error: categoryError} = await this.supabase
        .from('categories')
        .select('id, name')
        .eq('id', categoryId)
        .single();
      if (categoryError) {
        console.log(`DEBUG - updateResource: Category not found`, categoryError);
        throw new Error(`Category with ID ${categoryId} not found`);
      }

      if (fetchError) throw new Error('Resource not found or does not belong to the specified category');

      // If a new file is uploaded, handle it
      let updatedFileKey = resource.file_key;
      let newMimeType = resource.mime_type;

      if (file) {
        // Generate a new file path
        const timestamp = Date.now();
        const newFileName = `${category.id}/${Date.now()}_${file.originalname}`;

        // Upload new file
        const { error: uploadError } = await this.supabase.storage
          .from(this.BUCKET_NAME)
          .upload(newFileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Delete old file
        try {
          await this.supabase.storage.from(this.BUCKET_NAME).remove([resource.file_key]);
        } catch (deleteError) {
          console.error('Error deleting old file:', deleteError);
          // Continue even if old file deletion fails
        }

        updatedFileKey = newFileName;
        newMimeType = file.mimetype;
      }

      // Update the resource record
      const dataToUpdate = {
        ...updateData,
        ...(file ? { file_key: updatedFileKey, mime_type: newMimeType } : {})
      };

      const { data: updatedResource, error: updateError } = await this.supabase
        .from('resources')
        .update(dataToUpdate)
        .eq('id', resourceId)
        .eq('category_id', categoryId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Generate a signed URL
      const { data: urlData } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(updatedResource.file_key, 60 * 60); // 1 hour expiry

      return {
        ...updatedResource,
        signed_url: urlData?.signedUrl || null
      };
    } catch (error) {
      console.error('Error updating resource:', error);
      throw error;
    }
  }

  /**
   * Delete a resource
   * @param categoryId ID of the category
   * @param resourceId ID of the resource to delete
   * @returns Success message
   */
  async deleteResource(categoryId: string, resourceId: string) {
    try {
      // Get the resource to delete
      const { data: resource, error: fetchError } = await this.supabase
        .from('resources')
        .select('file_key')
        .eq('id', resourceId)
        .eq('category_id', categoryId)
        .single();

      if (fetchError) throw new Error('Resource not found or does not belong to the specified category');

      // Delete the file from storage
      try {
        const { error: storageError } = await this.supabase.storage
          .from(this.BUCKET_NAME)
          .remove([resource.file_key]);

        if (storageError) console.error('Error deleting file from storage:', storageError);
        // Continue with record deletion even if file deletion fails
      } catch (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with record deletion
      }

      // Delete the resource record
      const { error: deleteError } = await this.supabase
        .from('resources')
        .delete()
        .eq('id', resourceId)
        .eq('category_id', categoryId);

      if (deleteError) throw deleteError;

      return { success: true, message: 'Resource deleted successfully' };
    } catch (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  }

} 
