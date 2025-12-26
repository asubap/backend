import { Router, Request, Response } from 'express';
import { handleUpload } from '@vercel/blob/client';
import { verifySupabaseToken } from '../middleware/verifySupabaseToken';
import extractToken from '../utils/extractToken';
import { createSupabaseClient } from '../config/db';
import { IncomingMessage } from 'http';

const router = Router();

router.post('/resources/:categoryId', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;

    // Auth → build supabase client for validations
    const token = req.query.token as string;
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const supabase = createSupabaseClient(token);

    const jsonResponse = await handleUpload({
      request: req as unknown as IncomingMessage,
      body: req.body, // Express already JSON-parsed
      onBeforeGenerateToken: async () => {
        // Validate category exists
        const { data: category, error } = await supabase
          .from('categories')
          .select('id')
          .eq('id', categoryId)
          .single();

        if (error || !category) {
          throw new Error(`Category with ID ${categoryId} not found`);
        }

        return {
          allowedContentTypes: ['application/pdf', 'image/*', 'text/*', 'application/*'],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ categoryId, type: 'resource' }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Optional: log/validate; DB write happens when frontend calls your normal create-resource endpoint with blob.url
        console.log('Resource blob upload completed:', blob.url, tokenPayload);
      },
    });

    res.json(jsonResponse);
  } catch (error) {
    console.error('Error in blob upload:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

// Vercel Blob upload route for sponsor resources
router.post('/sponsor/:companyName', async (req: Request, res: Response) => {
  try {
    const { companyName } = req.params;

    // Auth → build supabase client for validations
    const token = req.query.token as string;
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const supabase = createSupabaseClient(token);

    const jsonResponse = await handleUpload({
      request: req as unknown as IncomingMessage,
      body: req.body, // Express already JSON-parsed
      onBeforeGenerateToken: async () => {
        // Validate sponsor exists
        const { data: sponsor, error } = await supabase
          .from('sponsor_info')
          .select('company_name')
          .eq('company_name', companyName)
          .single();

        if (error || !sponsor) {
          throw new Error(`Sponsor with company name '${companyName}' not found`);
        }

        return {
          allowedContentTypes: ['application/pdf', 'image/*', 'text/*', 'application/*'],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ companyName, type: 'sponsor' }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Optional: log/validate; DB write happens when frontend calls your normal create-resource endpoint with blob.url
        console.log('Sponsor blob upload completed:', blob.url, tokenPayload);
      },
    });

    res.json(jsonResponse);
  } catch (error) {
    console.error('Error in blob upload:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

// Vercel Blob delete route for general resources
router.delete('/resources/:categoryId', verifySupabaseToken, async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { blobUrl } = req.body; // Get blob URL from request body

    if (!blobUrl) {
      res.status(400).json({ error: 'Blob URL is required' });
      return;
    }

    // Auth → build supabase client for validations
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const supabase = createSupabaseClient(token);

    // Validate category exists and user has access
    const { data: category, error } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .single();

    if (error || !category) {
      res.status(404).json({ error: `Category with ID ${categoryId} not found` });
      return;
    }

    // Import del from @vercel/blob
    const { del } = await import('@vercel/blob');
    
    // Delete the blob
    await del(blobUrl);

    // Delete the resource from database
    const { error: deleteError } = await supabase
      .from('resources')
      .delete()
      .eq('file_key', blobUrl);

    if (deleteError) {
      console.error('Error deleting resource from database:', deleteError);
      // Don't fail the request if DB deletion fails, blob is already deleted
    }

    res.status(200).json({ success: true, message: 'Blob and resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting blob:', error);
    res.status(500).json({ error: 'Failed to delete blob' });
  }
});

// Vercel Blob delete route for sponsor resources
router.delete('/sponsor/:companyName', verifySupabaseToken, async (req: Request, res: Response) => {
  try {
    const { companyName } = req.params;
    const { blobUrl } = req.body; // Get blob URL from request body

    if (!blobUrl) {
      res.status(400).json({ error: 'Blob URL is required' });
      return;
    }

    // Auth → build supabase client for validations
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const supabase = createSupabaseClient(token);

    // Validate sponsor exists
    const { data: sponsor, error } = await supabase
      .from('sponsor_info')
      .select('company_name')
      .eq('company_name', companyName)
      .single();

    if (error || !sponsor) {
      res.status(404).json({ error: `Sponsor with company name '${companyName}' not found` });
      return;
    }

    // Import del from @vercel/blob
    const { del } = await import('@vercel/blob');
    
    // Delete the blob
    await del(blobUrl);

    // Delete the resource from database
    const { error: deleteError } = await supabase
      .from('resources')
      .delete()
      .eq('file_key', blobUrl);

    if (deleteError) {
      console.error('Error deleting resource from database:', deleteError);
      // Don't fail the request if DB deletion fails, blob is already deleted
    }

    res.status(200).json({ success: true, message: 'Blob and resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting blob:', error);
    res.status(500).json({ error: 'Failed to delete blob' });
  }
});

export default router;