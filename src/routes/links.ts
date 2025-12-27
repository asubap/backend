import { Router, RequestHandler } from "express";
import { verifySupabaseToken } from "../middleware/verifySupabaseToken";
import { requireEBoard } from "../middleware/requireRole";
import { LinksController } from "../controllers/linksController";

const linksRoutes = Router();
const controller = new LinksController();

linksRoutes
    // Public - anyone can view links
    .get('/', controller.getLinks.bind(controller) as RequestHandler)

    // E-board only - update links
    .put('/', verifySupabaseToken, requireEBoard, controller.updateLink.bind(controller) as RequestHandler);

export default linksRoutes; 