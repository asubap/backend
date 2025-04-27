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
      // First get all categories
      const { data: categories, error: categoryError } = await this.supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoryError) throw categoryError;

      // For each category, fetch its resources
      const result = await Promise.all(
        categories.map(async (category) => {
          const { data: resources, error: resourceError } = await this.supabase
            .from('resources')
            .select('*')
            .eq('category_id', category.id)
            .order('name');

          if (resourceError) throw resourceError;

          // Generate signed URLs for each resource file
          const resourcesWithUrls = await Promise.all(
            resources.map(async (resource) => {
              const { data: urlData } = await this.supabase.storage
                .from(this.BUCKET_NAME)
                .createSignedUrl(resource.file_key, 60 * 60); // 1 hour expiry

              return {
                ...resource,
                signed_url: urlData?.signedUrl || null
              };
            })
          );

          return {
            ...category,
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
  async addCategory(name: string, description: string) {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .insert({ name, description })
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
  async updateCategory(categoryId: string, updateData: { name?: string; description?: string }) {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .update(updateData)
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
   * @param file File to upload
   * @returns The newly created resource
   */
  async addResource(categoryId: string, name: string, description: string, file: Express.Multer.File) {
    try {
      // Check if category exists
      const { data: categoryCheck, error: categoryError } = await this.supabase
        .from('categories')
        .select('id')
        .eq('id', categoryId)
        .single();

      if (categoryError) throw new Error(`Category with ID ${categoryId} not found`);

      // Generate a unique file path
      const timestamp = Date.now();
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${categoryId}/${timestamp}_${file.originalname.replace(/\s+/g, '_')}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Create resource record in database
      const { data: resource, error: resourceError } = await this.supabase
        .from('resources')
        .insert({
          category_id: categoryId,
          name,
          description,
          file_key: fileName,
          mime_type: file.mimetype
        })
        .select()
        .single();

      if (resourceError) {
        // If resource creation fails, try to delete the uploaded file
        await this.supabase.storage.from(this.BUCKET_NAME).remove([fileName]);
        throw resourceError;
      }

      // Generate a signed URL for immediate use
      const { data: urlData } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(fileName, 60 * 60); // 1 hour expiry

      return {
        ...resource,
        signed_url: urlData?.signedUrl || null
      };
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

      if (fetchError) throw new Error('Resource not found or does not belong to the specified category');

      // If a new file is uploaded, handle it
      let updatedFileKey = resource.file_key;
      let newMimeType = resource.mime_type;

      if (file) {
        // Generate a new file path
        const timestamp = Date.now();
        const newFileName = `${categoryId}/${timestamp}_${file.originalname.replace(/\s+/g, '_')}`;

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