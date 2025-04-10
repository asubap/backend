import { Router } from "express";
import { MemberInfoController } from "../controllers/memberInfoController";

const memberInfoRoutes = Router();

const controller = new MemberInfoController();
memberInfoRoutes
// general routes
.get('/', controller.getAllMemberInfo.bind(controller)) // get all members info and their roles
.post('/', controller.getMemberInfoByEmail.bind(controller)) // get member info by email

// admin routes
.post('/edit-member-info', controller.editMemberInfo.bind(controller)) // edit member info by email

export default memberInfoRoutes;