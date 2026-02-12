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
// Get current user's member info (must be BEFORE other routes)
.get('/me', controller.getCurrentUserMemberInfo.bind(controller))

// Optimized summary endpoints (must be BEFORE parameterized routes)
.get('/active/summary', controller.getActiveMembersSummary.bind(controller))
.get('/alumni/summary', controller.getAlumniMembersSummary.bind(controller))

// Get filtered member lists
.get('/alumni', controller.getAlumniMembers.bind(controller))
.get('/active', controller.getActiveMembers.bind(controller))
.get('/archived', controller.getArchivedMembers.bind(controller))

// General routes
.get('/', controller.getAllMemberInfo.bind(controller))
.post('/', controller.getMemberInfoByEmail.bind(controller))
.post('/event-attendance', controller.getEventAttendance.bind(controller))

// Edit member info
.post('/edit-member-info', controller.editMemberInfo.bind(controller))
.post('/:email/archive', controller.archiveMember.bind(controller))
.post('/:email/restore', controller.restoreMember.bind(controller))

// Profile Photo Management
.post('/:email/pfp', upload.single('file'), controller.uploadProfilePhoto.bind(controller))
.delete('/:email/pfp', controller.deleteProfilePhoto.bind(controller))

// Full member details by email (must be AFTER other routes to avoid conflicts)
.get('/:email', controller.getMemberDetailsByEmail.bind(controller))

export default memberInfoRoutes;
