import { Router } from "express";
import EboardController from "../controllers/eboardController";

const eboardRoutes = Router();

const controller = new EboardController();
eboardRoutes
.get('/', controller.getEboard.bind(controller)) // get all users and their roles
.post('/add-role', controller.addRole.bind(controller)) // add role to user
.post('/edit-role', controller.editRole.bind(controller)) // edit role
.post('/delete-role', controller.deleteRole.bind(controller)) // delete role

export default eboardRoutes;