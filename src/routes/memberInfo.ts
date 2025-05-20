import { Router } from "express";
import { MemberInfoController } from "../controllers/memberInfoController";
import multer from "multer";

const memberInfoRoutes = Router();

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for profile photos
  }
});

const controller = new MemberInfoController();
memberInfoRoutes
// general routes
.get('/', controller.getAllMemberInfo.bind(controller)) // get all members info and their roles
.post('/', controller.getMemberInfoByEmail.bind(controller)) // get member info by email
.post('/get-member-info-by-id', controller.getMemberInfoById.bind(controller)) // get member info by id

// admin routes
.post('/edit-member-info', controller.editMemberInfo.bind(controller)) // edit member info by email

// Profile Photo Management
.post('/:email/pfp', upload.single('file'), controller.uploadProfilePhoto.bind(controller)) // upload/update profile photo
.delete('/:email/pfp', controller.deleteProfilePhoto.bind(controller)) // delete profile photo

export default memberInfoRoutes;