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
 // delete user-email
.get("/", controller.getAllSponsors.bind(controller)) // get all sponsors
.get("/:companyName/resources", controller.getSponsorResources.bind(controller)) // get sponsor resources by company name


.post("/get-sponsor-info",controller.getSponsorByPasscode.bind(controller)) // get sponsor info by company name;

// Sponsor Details Management
.patch("/details", verifySupabaseToken, controller.updateSponsorDetails.bind(controller)) // update sponsor details

// Resource Management
.post("/:companyName/resources", upload.single("file"), controller.addSponsorResource)
.delete("/:companyName/resources", controller.deleteSponsorResource.bind(controller))

// Profile Photo Management
.post("/:companyName/pfp",verifySupabaseToken,upload.single("file"), controller.uploadSponsorProfilePhoto)
.delete("/:companyName/pfp",verifySupabaseToken,controller.deleteSponsorProfilePhoto)


// Sponsor auth
.post("/auth", controller.sponsorAuth.bind(controller)); // authenticate sponsor


export default router;