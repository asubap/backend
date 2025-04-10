import { Router, Request, Response } from 'express';
import { verifySupabaseToken } from '../middleware/verifySupabaseToken';

const protectedRouter = Router();

protectedRouter.get('/', verifySupabaseToken, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ message: 'This is protected data', user });
});

export default protectedRouter;