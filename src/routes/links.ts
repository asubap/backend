import { Router, RequestHandler } from "express";
import { LinksController } from "../controllers/linksController";

const linksRoutes = Router();
const controller = new LinksController();

linksRoutes
    // Public - anyone can view links
    .get('/', controller.getLinks.bind(controller) as RequestHandler)

    // Update links - auth stripped for testing
    .put('/', controller.updateLink.bind(controller) as RequestHandler);

export default linksRoutes;
