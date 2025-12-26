import { Request, Response, NextFunction } from 'express';
import { jwtVerify, importJWK } from 'jose';

// Supabase JWT Public Key in JWK format
const SUPABASE_JWT_PUBLIC_KEY_JWK = process.env.JWT_PUBLIC_KEY;

if (!SUPABASE_JWT_PUBLIC_KEY_JWK) {
  console.error('JWT_PUBLIC_KEY is not set in environment variables. Get it from Supabase Dashboard → Settings → API → JWT Signing Keys');
}

// Parse the JWK from environment variable
let publicKey: any = null;
if (SUPABASE_JWT_PUBLIC_KEY_JWK) {
  try {
    // Parse the JWK JSON directly (should already be in JWK format)
    const jwk = JSON.parse(SUPABASE_JWT_PUBLIC_KEY_JWK);
    // importJWK is async, so we'll do this in the middleware
    publicKey = jwk;
  } catch (err) {
    console.error('Failed to parse JWT_PUBLIC_KEY as JWK:', err);
  }
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

export const verifySupabaseToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  try {
    if (!publicKey) {
      throw new Error('JWT_PUBLIC_KEY not configured');
    }

    // Import the JWK and verify the token with ES256
    const key = await importJWK(publicKey, 'ES256');
    const { payload } = await jwtVerify(token, key);

    const decoded = payload as unknown as SupabaseJwtPayload;

    if (!decoded || !decoded.sub) {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    // Attach user info to request
    (req as any).user = {
      id: decoded.sub,
      email: decoded.email || decoded.user_metadata?.email,
      role: decoded.role
    };

    next();
  } catch (err) {
    console.error('Token verification failed:', err);

    if (err instanceof Error) {
      if (err.message.includes('signature')) {
        res.status(401).json({ error: 'Invalid token signature' });
      } else if (err.message.includes('expired')) {
        res.status(401).json({ error: 'Token expired' });
      } else {
        res.status(401).json({ error: 'Token verification failed' });
      }
    } else {
      res.status(401).json({ error: 'Token verification failed' });
    }
  }
};