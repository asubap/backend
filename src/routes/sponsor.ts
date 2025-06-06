import { Router } from "express";
import { verifySupabaseToken } from "../middleware/verifySupabaseToken";
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

// Public routes (no authentication required)
router

// get sponsor names only
.get("/names", controller.getSponsorNames.bind(controller))

.post("/add-sponsor", verifySupabaseToken, controller.addSponsor.bind(controller)) // add new sponsor and send email to all recruiters 

.post("/change-sponsor-tier", verifySupabaseToken, controller.changeSponsorTier.bind(controller)) // change sponsor tier

// delete user-email
.post("/delete-sponsor", verifySupabaseToken, controller.deleteSponsor.bind(controller)) // delete sponsor and user-email

.get("/", controller.getSponsors.bind(controller)) // get all sponsors for admin
.get("/:companyName/resources", controller.getSponsorResources.bind(controller)) // get sponsor resources by company name
.post("/get-one-sponsor-info", controller.getSponsorByName.bind(controller)) // get sponsor info by company name

.get("/get-all-sponsor-info",controller.getAllSponsors.bind(controller)) // get sponsor all sponsor info for member search;

// Sponsor Details Management
.post("/:companyName/details", verifySupabaseToken, controller.updateSponsorDetails.bind(controller))

// Resource Management
.post("/:companyName/resources", upload.single("file"), controller.addSponsorResource)
.delete("/:companyName/resources", controller.deleteSponsorResource.bind(controller))

// Profile Photo Management
.post("/:companyName/pfp",verifySupabaseToken,upload.single("file"), controller.uploadSponsorProfilePhoto)
.delete("/:companyName/pfp",verifySupabaseToken,controller.deleteSponsorProfilePhoto)


// Sponsor auth
// .post("/auth", controller.sponsorAuth.bind(controller)); // authenticate sponsor


export default router;