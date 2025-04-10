import { Router } from "express";
import { MemberInfoController } from "../controllers/memberInfoController";

const memberInfoRoutes = Router();

const controller = new MemberInfoController();
memberInfoRoutes
// general routes
.get('/', controller.getAllMemberInfo.bind(controller)) // get all members info, including roles
.post('/', controller.getMemberInfo.bind(controller)) // get member info

// admin routes
.post('/edit-member-info', controller.editMemberInfo.bind(controller)) // edit member info
.post('/delete-member', controller.deleteMember.bind(controller)) // remove member


export default memberInfoRoutes;