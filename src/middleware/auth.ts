import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
      res.status(401).json({ error: 'No access token provided' });
      return;
    }

    const decoded = jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_SECRET!
    ) as jwt.JwtPayload;

    // Verify user exists in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', decoded.sub)
      .single();

    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const verifyRefreshToken = async (
  refreshToken: string
): Promise<{ userId: string; jti: string } | null> => {
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    ) as jwt.JwtPayload;

    // Verify refresh token JTI exists in database
    const { data: token, error } = await supabase
      .from('refresh_tokens')
      .select('user_id, jti')
      .eq('jti', decoded.jti)
      .single();

    if (error || !token) {
      return null;
    }

    return {
      userId: token.user_id,
      jti: token.jti,
    };
  } catch (error) {
    return null;
  }
}; 