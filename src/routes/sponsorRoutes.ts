import { Router } from "express";
import UserController from "../controllers/userController";
import SponsorController from "../controllers/sponsorController";
import { verifySupabaseToken } from "middleware/verifySupabaseToken";
const sponsorRoutes = Router();

const controller = new SponsorController();
sponsorRoutes
.post("/add-sponsor", verifySupabaseToken, controller.addSponsor.bind(controller)) // add sponsor-email and assign role
 // delete user-email

export default sponsorRoutes;