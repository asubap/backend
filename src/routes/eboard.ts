import { Router } from "express";
import EboardController from "../controllers/eboardController";

const eboardRoutes = Router();

const controller = new EboardController();
eboardRoutes
// Public - anyone can view e-board roster
.get('/', controller.getEboard.bind(controller))

// E-board management - auth stripped for testing
.post('/add-role', controller.addRole.bind(controller))
.post('/edit-role', controller.editRole.bind(controller))
.post('/delete-role', controller.deleteRole.bind(controller));

export default eboardRoutes;
