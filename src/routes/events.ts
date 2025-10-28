import { Router, RequestHandler } from "express";
import { EventController } from "../controllers/eventController";

const eventRoutes = Router();
const controller = new EventController();

// PUBLIC ROUTES - No authentication required
eventRoutes.get('/public', controller.getPublicEvents.bind(controller));
eventRoutes.get('/calendar.ics', controller.getCalendarFeed.bind(controller));

// MEMBER/SPONSOR ROUTES - auth stripped for testing
eventRoutes.get('/', controller.getEvents.bind(controller) as RequestHandler);

eventRoutes.post('/', controller.getEventByID.bind(controller) as RequestHandler);
eventRoutes.post('/checkin/:eventId', controller.verifyAttendance.bind(controller) as RequestHandler);

// rsvp routes - auth stripped for testing
eventRoutes.post('/rsvp/:eventId', controller.rsvpForEvent.bind(controller) as RequestHandler);
eventRoutes.post('/unrsvp/:eventId', controller.unRsvpForEvent.bind(controller) as RequestHandler);

// E-BOARD ONLY ROUTES - auth stripped for testing
eventRoutes.get('/:eventId/participants', controller.getEventParticipants.bind(controller) as RequestHandler);
eventRoutes.post('/send-event', controller.sendEvent.bind(controller) as RequestHandler);

eventRoutes.post('/add-event', controller.addEvent.bind(controller) as RequestHandler);
eventRoutes.post('/edit-event', controller.editEvent.bind(controller) as RequestHandler);

eventRoutes.post('/delete-event', controller.deleteEvent.bind(controller) as RequestHandler);
eventRoutes.post('/add-member-attending', controller.addMemberAttending.bind(controller) as RequestHandler);

eventRoutes.post('/delete-member-attending', controller.deleteMemberAttending.bind(controller) as RequestHandler);
export default eventRoutes;
