import { Router } from "express";
import UserController from "../controllers/userController";

const userRoleRoutes = Router();

const controller = new UserController();
userRoleRoutes
.get('/', controller.getAllUsers.bind(controller)) // get all users and their roles
.post('/', controller.getUserRole.bind(controller)) // get user role by email

.post('/get-users-by-ids', controller.getUsersByIds.bind(controller)) // get users by list of ids

.post('/add-user', controller.addUser.bind(controller)) // add user-email and assign role
.post('/update-role', controller.updateUserRole.bind(controller)) // update user-email or role
.post('/delete-user', controller.deleteUser.bind(controller)) // delete user-email

export default userRoleRoutes;