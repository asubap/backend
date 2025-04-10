import { Router } from "express";
import { announcementsController } from "../controllers/announcementsController";


const announcementsRoutes = Router();

const controller = new announcementsController();
announcementsRoutes
// general routes
.get('/', controller.getannouncements.bind(controller)) // get all announcementss
.post('/', controller.getannouncementByID.bind(controller)) // get all announcementss

// admin routes
.post('/add-announcement', controller.addannouncements.bind(controller)) // add an announcements
.post('/edit-announcement', controller.editannouncements.bind(controller)) // edit an announcements
.post('/delete-announcement', controller.deleteannouncements.bind(controller)) // delete an announcements


export default announcementsRoutes;