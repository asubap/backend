import { Router, RequestHandler } from "express";
import { EventController } from "../controllers/eventController";
import { verifySupabaseToken } from "../middleware/verifySupabaseToken";

const eventRoutes = Router();

const controller = new EventController();
eventRoutes

// public routes
.get('/public', controller.getPublicEvents.bind(controller)) // get all events for public view
.get('/', verifySupabaseToken, controller.getEvents.bind(controller)) // get all events (authenticated)

.post('/', verifySupabaseToken, controller.getEventByID.bind(controller)) // get events by id

// checkin route
.post('/checkin/:eventId', verifySupabaseToken, controller.verifyAttendance.bind(controller) as RequestHandler)

// rsvp route
.post('/rsvp/:eventId', verifySupabaseToken, controller.rsvpForEvent.bind(controller) as RequestHandler)

// admin routes
.post('/add-event', verifySupabaseToken, controller.addEvent.bind(controller)) // add an event
.post('/edit-event', verifySupabaseToken, controller.editEvent.bind(controller)) // edit an event
.post('/delete-event', verifySupabaseToken, controller.deleteEvent.bind(controller)) // delete an event

export default eventRoutes;
