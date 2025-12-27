import { Router } from "express";
import { verifySupabaseToken } from "../middleware/verifySupabaseToken";
import { requireEBoard } from "../middleware/requireRole";
import EboardController from "../controllers/eboardController";

const eboardRoutes = Router();

const controller = new EboardController();
eboardRoutes
// Public - anyone can view e-board roster
.get('/', controller.getEboard.bind(controller))

// E-board only - manage roster
.post('/add-role', verifySupabaseToken, requireEBoard, controller.addRole.bind(controller))
.post('/edit-role', verifySupabaseToken, requireEBoard, controller.editRole.bind(controller))
.post('/delete-role', verifySupabaseToken, requireEBoard, controller.deleteRole.bind(controller));

export default eboardRoutes;