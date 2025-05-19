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
.post('/checkin/:eventId', verifySupabaseToken, controller.verifyAttendance.bind(controller) as RequestHandler)

// rsvp route
.post('/rsvp/:eventId', verifySupabaseToken, controller.rsvpForEvent.bind(controller) as RequestHandler)
.post('/unrsvp/:eventId', verifySupabaseToken, controller.unRsvpForEvent.bind(controller) as RequestHandler)

// admin routes
.post('/send-event', controller.sendEvent.bind(controller)) // sends event to all members immediately
.post('/add-event', controller.addEvent.bind(controller)) // add an event
.post('/edit-event', controller.editEvent.bind(controller)) // edit an event
.post('/delete-event', controller.deleteEvent.bind(controller)) // delete an event

export default eventRoutes;
