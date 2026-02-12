import { Router } from "express";
import multer from "multer";
import { SponsorController } from "../controllers/sponsorController";

const router = Router();

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

const controller = new SponsorController();

router
// Optimized summary endpoints (must be BEFORE other routes to avoid conflicts)
.get("/summary", controller.getSponsorsSummary.bind(controller))

// get sponsor names only
.get("/names", controller.getSponsorNames.bind(controller))

.post("/add-sponsor", controller.addSponsor.bind(controller))
.post("/change-sponsor-tier", controller.changeSponsorTier.bind(controller))
.post("/delete-sponsor", controller.deleteSponsor.bind(controller))

.get("/", controller.getSponsors.bind(controller))
.get("/:companyName/resources", controller.getSponsorResources.bind(controller))
.post("/get-one-sponsor-info", controller.getSponsorByName.bind(controller))

.get("/get-all-sponsor-info", controller.getAllSponsors.bind(controller))

// Sponsor Details Management
.post("/:companyName/details", controller.updateSponsorDetails.bind(controller))

// Resource Management
.post("/:companyName/resources", upload.single("file"), controller.addSponsorResource)
.delete("/:companyName/resources", controller.deleteSponsorResource.bind(controller))

// Profile Photo Management
.post("/:companyName/pfp", upload.single("file"), controller.uploadSponsorProfilePhoto)
.delete("/:companyName/pfp", controller.deleteSponsorProfilePhoto)

// Get sponsor by ID (must be AFTER other parameterized routes to avoid conflicts)
.get("/:id", controller.getSponsorById.bind(controller))

export default router;
