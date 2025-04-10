import { Router, Request, Response } from "express";
import userRoutes from "./user";
import eventRoutes from "./events";
import announcementsRoutes from "./announcements";
import profilePhotoRoutes from './profilePhotoRoutes';
import memberInfoRoutes from "./memberInfo";
const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello, TypeScript + Express!" });
});

router.use("/member-info", memberInfoRoutes);
router.use("/users", userRoutes);
router.use("/events", eventRoutes);
router.use("/announcements", announcementsRoutes);
router.use('/profile-photo', profilePhotoRoutes);

export default router;
