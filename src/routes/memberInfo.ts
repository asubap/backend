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

// Optimized summary endpoints (must be BEFORE parameterized routes)
.get('/active/summary', verifySupabaseToken, controller.getActiveMembersSummary.bind(controller)) // get active members summary (optimized)
.get('/alumni/summary', verifySupabaseToken, controller.getAlumniMembersSummary.bind(controller)) // get alumni members summary (optimized)

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

// Full member details by email (must be AFTER other routes to avoid conflicts)
.get('/:email', verifySupabaseToken, controller.getMemberDetailsByEmail.bind(controller)) // get full member details by email

export default memberInfoRoutes;