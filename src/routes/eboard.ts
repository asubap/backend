import { Router } from "express";
import EboardController from "../controllers/eboardController";

const eboardRoutes = Router();

const controller = new EboardController();
eboardRoutes
.get('/', controller.getEboard.bind(controller)) // get all users and their roles
.post('/add', controller.addEboard.bind(controller)) // add eboard

export default eboardRoutes;