import { Request, Response } from 'express';
import { createSupabaseClient } from '../config/db';

// Upload profile photo
export const uploadProfilePhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    const file = (req as any).file;
    if (!file) {
      res.status(400).send('No file uploaded.');
      return;
    }

    const supabase = createSupabaseClient();

    const { data, error } = await supabase.storage
      .from('profile-photos')
      .upload(`${userId}/${file.originalname}`, file.buffer);

    if (error) throw error;

    const photoUrl = data?.path ? `${process.env.SUPABASE_URL}/storage/v1/object/public/profile-photos/${data.path}` : '';

    // Update the member_info table with the new photo URL
    const { error: updateError } = await supabase
      .from('member_info')
      .update({ profile_photo_url: photoUrl })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    res.status(200).send({ photoUrl });
  } catch (error) {
    res.status(500).send((error as any).message);
  }
};

// Retrieve profile photo
export const getProfilePhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = createSupabaseClient();
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('member_info')
      .select('profile_photo_url')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    res.status(200).send(data);
  } catch (error) {
    res.status(500).send((error as any).message);
  }
};

// Update profile photo
export const updateProfilePhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = createSupabaseClient();
    const { userId } = req.body;
    const file = (req as any).file;
    if (!file) {
      res.status(400).send('No file uploaded.');
      return;
    }

    // Delete the old photo
    const { data: oldData, error: oldError } = await supabase
      .from('member_info')
      .select('profile_photo_url')
      .eq('user_id', userId)
      .single();

    if (oldError) throw oldError;

    const oldPhotoPath = oldData?.profile_photo_url?.split('/').slice(-2).join('/');
    if (oldPhotoPath) {
      await supabase.storage.from('profile-photos').remove([oldPhotoPath]);
    }

    // Upload new photo
    const { data, error } = await supabase.storage
      .from('profile-photos')
      .upload(`${userId}/${file.originalname}`, file.buffer);

    if (error) throw error;

    const photoUrl = data?.path ? `${process.env.SUPABASE_URL}/storage/v1/object/public/profile-photos/${data.path}` : '';

    const { error: updateError } = await supabase
      .from('member_info')
      .update({ profile_photo_url: photoUrl })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    res.status(200).send({ photoUrl });
  } catch (error) {
    res.status(500).send((error as any).message);
  }
};

// Delete profile photo
export const deleteProfilePhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = createSupabaseClient();
    const { userId } = req.params;

    // Get the current photo URL
    const { data, error } = await supabase
      .from('member_info')
      .select('profile_photo_url')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    const photoPath = data?.profile_photo_url?.split('/').slice(-2).join('/');
    if (photoPath) {
      await supabase.storage.from('profile-photos').remove([photoPath]);
    }

    // Clear the photo URL in the database
    const { error: updateError } = await supabase
      .from('member_info')
      .update({ profile_photo_url: null })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    res.status(200).send({ message: 'Profile photo deleted successfully.' });
  } catch (error) {
    res.status(500).send((error as any).message);
  }
};

// Additional functions for retrieving, updating, and deleting photos can be added here. 