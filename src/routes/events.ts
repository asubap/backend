import { Router, RequestHandler } from "express";
import { EventController } from "../controllers/eventController";
import { verifySupabaseToken } from "../middleware/verifySupabaseToken";

const eventRoutes = Router();

const controller = new EventController();
eventRoutes

// public routes
.get('/public', controller.getPublicEvents.bind(controller)) // get all events for public view
.get('/', controller.getEvents.bind(controller)) // get all events (authenticated)

.post('/', controller.getEventByID.bind(controller)) // get events by id

// checkin route
.post('/checkin/:eventId', controller.verifyAttendance.bind(controller) as RequestHandler)

// rsvp route
.post('/rsvp/:eventId', controller.rsvpForEvent.bind(controller) as RequestHandler)
.post('/unrsvp/:eventId', verifySupabaseToken, controller.unRsvpForEvent.bind(controller) as RequestHandler)

// admin routes
.post('/send-event', controller.sendEvent.bind(controller)) // sends event to all members immediately
.post('/add-event', controller.addEvent.bind(controller)) // add an event
.post('/edit-event', controller.editEvent.bind(controller)) // edit an event
.post('/delete-event', controller.deleteEvent.bind(controller)) // delete an event
.post('/add-member-attending', verifySupabaseToken, controller.addMemberAttending.bind(controller) as RequestHandler) // add member to event without location check
.post('/delete-member-attending', verifySupabaseToken, controller.deleteMemberAttending.bind(controller) as RequestHandler) // remove member from event and update hours

export default eventRoutes;
