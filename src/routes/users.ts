import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get current user profile
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', req.user!.id)
      .single();

    if (error || !user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 