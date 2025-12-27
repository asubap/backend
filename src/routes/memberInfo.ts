import { Router } from "express";
import { MemberInfoController } from "../controllers/memberInfoController";
import multer from "multer";
import { verifySupabaseToken } from "../middleware/verifySupabaseToken";
import { requireEBoard } from "../middleware/requireRole";

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
// Auth required - Get current user's member info (must be BEFORE other routes)
.get('/me', verifySupabaseToken, controller.getCurrentUserMemberInfo.bind(controller))

// Auth required - Optimized summary endpoints (must be BEFORE parameterized routes)
.get('/active/summary', verifySupabaseToken, controller.getActiveMembersSummary.bind(controller))
.get('/alumni/summary', verifySupabaseToken, controller.getAlumniMembersSummary.bind(controller))

// Auth required - Get filtered member lists
.get('/alumni', verifySupabaseToken, controller.getAlumniMembers.bind(controller))
.get('/active', verifySupabaseToken, controller.getActiveMembers.bind(controller))
.get('/archived', verifySupabaseToken, controller.getArchivedMembers.bind(controller))

// Auth required - General routes
.get('/', verifySupabaseToken, controller.getAllMemberInfo.bind(controller))
.post('/', verifySupabaseToken, controller.getMemberInfoByEmail.bind(controller))
.post('/event-attendance', verifySupabaseToken, controller.getEventAttendance.bind(controller))

// E-board only - Admin routes
.post('/edit-member-info', verifySupabaseToken, requireEBoard, controller.editMemberInfo.bind(controller))
.post('/:email/archive', verifySupabaseToken, requireEBoard, controller.archiveMember.bind(controller))
.post('/:email/restore', verifySupabaseToken, requireEBoard, controller.restoreMember.bind(controller))

// Auth required - Profile Photo Management
.post('/:email/pfp', verifySupabaseToken, upload.single('file'), controller.uploadProfilePhoto.bind(controller))
.delete('/:email/pfp', verifySupabaseToken, controller.deleteProfilePhoto.bind(controller))

// Auth required - Full member details by email (must be AFTER other routes to avoid conflicts)
.get('/:email', verifySupabaseToken, controller.getMemberDetailsByEmail.bind(controller))

export default memberInfoRoutes;