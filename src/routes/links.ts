import { Router, RequestHandler } from "express";
import { LinksController } from "../controllers/linksController";

const linksRoutes = Router();
const controller = new LinksController();

linksRoutes
    .get('/', controller.getLinks.bind(controller) as RequestHandler)
    .put('/', controller.updateLink.bind(controller) as RequestHandler);

export default linksRoutes; 