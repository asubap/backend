import { Router } from "express";
import { verifySupabaseToken } from "../middleware/verifySupabaseToken";
import multer from "multer";
import * as sponsorController from "../controllers/sponsorController";

const router = Router();

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Public routes (no authentication required)
router.get("/", sponsorController.getAllSponsors);
router.get("/:companyName", sponsorController.getSponsorInfo);
router.get("/:companyName/resources", sponsorController.getSponsorResources);

// Protected routes (authentication required)

// Resource Management
router.post(
  "/:companyName/resources",
  verifySupabaseToken,
  upload.single("file"),
  sponsorController.addSponsorResource
);
router.delete(
  "/:companyName/resources",
  verifySupabaseToken,
  sponsorController.deleteSponsorResource
);

// Profile Photo Management
router.post(
  "/:companyName/pfp",
  verifySupabaseToken,
  upload.single("file"), 
  sponsorController.uploadSponsorProfilePhoto
);
router.delete(
  "/:companyName/pfp",
  verifySupabaseToken,
  sponsorController.deleteSponsorProfilePhoto
);

export default router; 