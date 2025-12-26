import { Request, Response, NextFunction } from 'express';
import UserService from '../services/userService';
import extractToken from '../utils/extractToken';

export type UserRole = 'general-member' | 'e-board' | 'sponsor';
export type RequiredRole = 'member' | 'e-board' | 'sponsor';

/**
 * Middleware factory to require specific role for route access
 * Reuses existing UserService.getUserRole() method
 */
export function requireRole(requiredRole: RequiredRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;

      if (!user || !user.email) {
        res.status(401).json({ error: 'Unauthorized: No user information' });
        return;
      }

      const token = extractToken(req);
      if (!token) {
        res.status(401).json({ error: 'Unauthorized: No token' });
        return;
      }

      const userService = new UserService();
      userService.setToken(token as string);

      const userRole = await userService.getUserRole(user.email);

      if (!userRole) {
        res.status(403).json({ error: 'Forbidden: No role assigned' });
        return;
      }

      // Check role hierarchy: e-board > general-member
      if (requiredRole === 'e-board' && userRole !== 'e-board') {
        res.status(403).json({
          error: `Forbidden: Requires e-board role`,
          userRole: userRole
        });
        return;
      }

      // For member role requirement, allow both 'general-member' and 'e-board' (e-board has higher privileges)
      if (requiredRole === 'member' && userRole !== 'general-member' && userRole !== 'e-board') {
        res.status(403).json({
          error: `Forbidden: Requires general-member or e-board role`,
          userRole: userRole
        });
        return;
      }

      // For sponsor role requirement, only allow sponsors
      if (requiredRole === 'sponsor' && userRole !== 'sponsor') {
        res.status(403).json({
          error: `Forbidden: Requires sponsor role`,
          userRole: userRole
        });
        return;
      }

      // Attach role to request for later use
      (req as any).userRole = userRole;

      next();
    } catch (error) {
      console.error('Error in requireRole middleware:', error);
      res.status(500).json({ error: 'Error checking user permissions' });
    }
  };
}

/**
 * Convenience middleware for e-board only routes
 */
export const requireEBoard = requireRole('e-board');

/**
 * Convenience middleware for any authenticated member
 */
export const requireMember = requireRole('member');

/**
 * Convenience middleware for sponsor only routes
 */
export const requireSponsor = requireRole('sponsor');

/**
 * Middleware that allows both members (general-member, e-board) AND sponsors
 * Useful for viewing events
 */
export async function requireMemberOrSponsor(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    if (!user || !user.email) {
      res.status(401).json({ error: 'Unauthorized: No user information' });
      return;
    }

    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: 'Unauthorized: No token' });
      return;
    }

    const userService = new UserService();
    userService.setToken(token as string);

    const userRole = await userService.getUserRole(user.email);

    if (!userRole) {
      res.status(403).json({ error: 'Forbidden: No role assigned' });
      return;
    }

    const allowedRoles: UserRole[] = ['general-member', 'e-board', 'sponsor'];

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden: Requires member or sponsor role',
        userRole: userRole
      });
      return;
    }

    // Attach role to request for later use
    (req as any).userRole = userRole;

    next();
  } catch (error) {
    console.error('Error in requireMemberOrSponsor middleware:', error);
    res.status(500).json({ error: 'Error checking user permissions' });
  }
}
