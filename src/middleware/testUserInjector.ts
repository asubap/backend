import { Request, Response, NextFunction } from 'express';

/**
 * Test-only middleware: injects req.user from custom headers.
 *
 * Headers:
 *   X-Test-User-Id:    Supabase auth user ID (uuid)
 *   X-Test-User-Email:  User email
 *   X-Test-User-Role:   Role (defaults to 'authenticated')
 *
 * If no headers are provided, req.user is left untouched (other middleware may set it).
 */
export const testUserInjector = (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.headers['x-test-user-id'] as string;
  const userEmail = req.headers['x-test-user-email'] as string;
  const userRole = req.headers['x-test-user-role'] as string;

  if (userId || userEmail) {
    (req as any).user = {
      id: userId || 'test-user-default',
      email: userEmail || 'test@test.com',
      role: userRole || 'authenticated',
    };
    // Also set userRole which controllers read (normally set by requireRole middleware)
    (req as any).userRole = userRole || 'general-member';
  }

  next();
};
