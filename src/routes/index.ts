import { Router, Request, Response } from "express";
import userRoutes from "./user";
import eventRoutes from "./events";
import announcementsRoutes from "./announcements";
import memberInfoRoutes from "./memberInfo";
import sponsorRoutes from "./sponsor";
import resourceRoutes from "./resources";
import eboardRoutes from "./eboard";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello, TypeScript + Express!" });
});

router.use("/member-info", memberInfoRoutes);
router.use("/users", userRoutes);
router.use("/events", eventRoutes);
router.use("/announcements", announcementsRoutes);
router.use('/sponsors', sponsorRoutes);
router.use('/resources', resourceRoutes);
router.use('/eboard', eboardRoutes);

export default router;
