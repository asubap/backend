import { Router } from "express";
import UserRoleController from "../controllers/userRoleController";

const userRoleRoutes = Router();

const controller = new UserRoleController();
userRoleRoutes
.post('/', controller.getUserRoles.bind(controller)) // get user roles by id
.post('/assign-role', controller.assignRoles.bind(controller)) // assign roles
.post('/remove-role', controller.removeRoles.bind(controller)) // remove roles

export default userRoleRoutes;