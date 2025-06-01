import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { verifyRefreshToken } from '../middleware/auth';

const router = Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to set cookies
const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
    domain: process.env.COOKIE_DOMAIN,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
    domain: process.env.COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// Login endpoint
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Verify credentials with Supabase
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate new refresh token JTI
    const refreshJti = uuidv4();

    // Store refresh token JTI in database
    await supabase.from('refresh_tokens').insert({
      user_id: user.id,
      jti: refreshJti,
    });

    // Generate tokens
    const accessTokenOptions: SignOptions = {
      expiresIn: '15m', // Hardcoded to match cookie maxAge
    };

    const refreshTokenOptions: SignOptions = {
      expiresIn: '7d', // Hardcoded to match cookie maxAge
    };

    const accessToken = jwt.sign(
      { sub: user.id },
      process.env.JWT_ACCESS_SECRET!,
      accessTokenOptions
    );

    const refreshToken = jwt.sign(
      { sub: user.id, jti: refreshJti },
      process.env.JWT_REFRESH_SECRET!,
      refreshTokenOptions
    );

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    res.json({ message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    // Verify refresh token and get user info
    const tokenData = await verifyRefreshToken(refreshToken);
    if (!tokenData) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    // Generate new refresh token JTI
    const newRefreshJti = uuidv4();

    // Update refresh token in database
    await supabase
      .from('refresh_tokens')
      .update({ jti: newRefreshJti })
      .eq('jti', tokenData.jti);

    // Generate new tokens
    const accessTokenOptions: SignOptions = {
      expiresIn: '15m', // Hardcoded to match cookie maxAge
    };

    const refreshTokenOptions: SignOptions = {
      expiresIn: '7d', // Hardcoded to match cookie maxAge
    };

    const accessToken = jwt.sign(
      { sub: tokenData.userId },
      process.env.JWT_ACCESS_SECRET!,
      accessTokenOptions
    );

    const newRefreshToken = jwt.sign(
      { sub: tokenData.userId, jti: newRefreshJti },
      process.env.JWT_REFRESH_SECRET!,
      refreshTokenOptions
    );

    // Set new cookies
    setAuthCookies(res, accessToken, newRefreshToken);

    res.json({ message: 'Token refresh successful' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (refreshToken) {
      const tokenData = await verifyRefreshToken(refreshToken);
      if (tokenData) {
        // Remove refresh token from database
        await supabase
          .from('refresh_tokens')
          .delete()
          .eq('jti', tokenData.jti);
      }
    }

    // Clear cookies
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
      domain: process.env.COOKIE_DOMAIN,
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
      domain: process.env.COOKIE_DOMAIN,
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 