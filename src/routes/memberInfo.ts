import { Router } from "express";
import { MemberInfoController } from "../controllers/memberInfoController";
import multer from "multer";
import { verifySupabaseToken } from "../middleware/verifySupabaseToken";

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
// Get current user's member info (must be BEFORE other routes)
.get('/me', verifySupabaseToken, controller.getCurrentUserMemberInfo.bind(controller))

// Get filtered member lists
.get('/alumni', verifySupabaseToken, controller.getAlumniMembers.bind(controller))
.get('/active', verifySupabaseToken, controller.getActiveMembers.bind(controller))

// general routes
.get('/', controller.getAllMemberInfo.bind(controller)) // get all members info and their roles
.post('/', controller.getMemberInfoByEmail.bind(controller)) // get member info by email
.post('/event-attendance', controller.getEventAttendance.bind(controller)) // get event attendance for member

// admin routes
.post('/edit-member-info', controller.editMemberInfo.bind(controller)) // edit member info by email

// Profile Photo Management
.post('/:email/pfp', upload.single('file'), controller.uploadProfilePhoto.bind(controller)) // upload/update profile photo
.delete('/:email/pfp', controller.deleteProfilePhoto.bind(controller)) // delete profile photo

export default memberInfoRoutes;