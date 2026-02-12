import { Router } from "express";
import UserController from "../controllers/userController";

const userRoleRoutes = Router();

const controller = new UserController();
userRoleRoutes
.get('/summary', controller.getUsersSummary.bind(controller))
.get('/', controller.getAllUsers.bind(controller))
.post('/', controller.getUserRole.bind(controller))
.post('/add-user', controller.addUser.bind(controller))
.post('/update-role', controller.updateUserRole.bind(controller))
.post('/delete-user', controller.deleteUser.bind(controller))

export default userRoleRoutes;
