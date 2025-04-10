import { Router, Request, Response } from "express";
import userRoleRoutes from "./roles";
import memberInfoRoutes from "./memberInfo";
import eventRoutes from "./events";
import announcementsRoutes from "./announcements";
import profilePhotoRoutes from './profilePhotoRoutes';
const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello, TypeScript + Express!" });
});

router.use("/roles", userRoleRoutes);
router.use("/member-info", memberInfoRoutes);
router.use("/events", eventRoutes);
router.use("/announcements", announcementsRoutes);
router.use('/profile-photo', profilePhotoRoutes);

export default router;
