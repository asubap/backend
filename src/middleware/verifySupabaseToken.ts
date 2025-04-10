import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SUPABASE_JWT_SECRET = process.env.JWT_SECRET || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_JWT_SECRET) {
  console.error('Neither SUPABASE_JWT_SECRET nor SUPABASE_SERVICE_ROLE_KEY is set in environment variables');
}

export interface SupabaseJwtPayload {
  aud: string;
  exp: number;
  sub: string;
  email?: string;
  role?: string;
  user_metadata?: {
    email?: string;
  };
}

export const verifySupabaseToken = (req: Request, res: Response, next: NextFunction) => {
  console.log('Verifying Supabase token...');
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('Missing Authorization header');
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('Missing token in Authorization header');
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  try {
    console.log('Attempting to verify token...');
    // First try to verify with JWT_SECRET
    const decoded = jwt.decode(token) as SupabaseJwtPayload;
    console.log('Decoded token:', decoded);

    if (!decoded || !decoded.sub) {
      console.error('Invalid token format');
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    // Attach user info to request
    (req as any).user = {
      id: decoded.sub,
      email: decoded.email || decoded.user_metadata?.email,
      role: decoded.role
    };

    console.log('Token verified successfully. User:', (req as any).user);
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
};