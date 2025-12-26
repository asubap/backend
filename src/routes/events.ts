import { Router, RequestHandler } from "express";
import { EventController } from "../controllers/eventController";
import { verifySupabaseToken } from "../middleware/verifySupabaseToken";
import { requireEBoard, requireMember, requireMemberOrSponsor } from "../middleware/requireRole";

const eventRoutes = Router();
const controller = new EventController();

// PUBLIC ROUTES - No authentication required
eventRoutes.get('/public', controller.getPublicEvents.bind(controller));

// MEMBER/SPONSOR ROUTES - Allow both members and sponsors to view events
eventRoutes.get('/', verifySupabaseToken, requireMemberOrSponsor, controller.getEvents.bind(controller) as RequestHandler);

eventRoutes.post('/', verifySupabaseToken, requireMemberOrSponsor, controller.getEventByID.bind(controller) as RequestHandler);
eventRoutes.post('/checkin/:eventId', verifySupabaseToken, requireMemberOrSponsor, controller.verifyAttendance.bind(controller) as RequestHandler);

eventRoutes.post('/rsvp/:eventId', verifySupabaseToken, requireMemberOrSponsor, controller.rsvpForEvent.bind(controller) as RequestHandler);
eventRoutes.post('/unrsvp/:eventId', verifySupabaseToken, requireMemberOrSponsor, controller.unRsvpForEvent.bind(controller) as RequestHandler);

// E-BOARD ONLY ROUTES
eventRoutes.get('/:eventId/participants', verifySupabaseToken, requireEBoard, controller.getEventParticipants.bind(controller) as RequestHandler);
eventRoutes.post('/send-event',verifySupabaseToken, requireEBoard, controller.sendEvent.bind(controller) as RequestHandler);

eventRoutes.post('/add-event', verifySupabaseToken, requireEBoard, controller.addEvent.bind(controller) as RequestHandler);
eventRoutes.post('/edit-event', verifySupabaseToken, requireEBoard, controller.editEvent.bind(controller) as RequestHandler);

eventRoutes.post('/delete-event', verifySupabaseToken, requireEBoard, controller.deleteEvent.bind(controller) as RequestHandler);
eventRoutes.post('/add-member-attending', verifySupabaseToken, requireEBoard, controller.addMemberAttending.bind(controller) as RequestHandler);

eventRoutes.post('/delete-member-attending', verifySupabaseToken, requireEBoard, controller.deleteMemberAttending.bind(controller) as RequestHandler);
export default eventRoutes;
