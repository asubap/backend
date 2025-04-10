import { Request, Response } from "express";
import { MemberInfoService } from "../services/memberInfoService";
import extractToken from "../utils/extractToken";
import UserRoleService from "../services/userRoleService";
import { EventService } from "../services/eventService";
import { geocodeAddress } from "../utils/geocoding";

export class EventController {
    private eventService: EventService;
    private userRoleService: UserRoleService;

    constructor() {
        this.eventService = new EventService();
        this.userRoleService = new UserRoleService();
    }

    /**
     * Get all events
     * @param req 
     * @param res 
     * @returns 
     */
    async getEvents(req: Request, res: Response) {
        try {

            console.log('Getting events...');
            const token = extractToken(req);
            console.log('Token:', token ? 'Present' : 'Missing');


            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }

            this.eventService.setToken(token as string);

            console.log('Token set in service');

            const events = await this.eventService.getEvents();
            console.log('Events retrieved:', events);
            res.json(events);
        } catch (error) {
            console.error('Error getting events:', error);
            res.status(500).json({ error: 'Failed to get events' });

        }
    }

    /**
     * Get all events by name
     * @param req 
     * @param res 
     * @returns 
     */
    async getEventByID(req: Request, res: Response) {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }

        this.eventService.setToken(token as string);

        try {
            const { event_id } = req.body;
            const event = await this.eventService.getEventID(event_id);
            res.json(event);
        } catch (error) {
            console.error('Error fetching event:', error);
            res.status(500).json({ error: 'Failed to fetch event' });
        }
    }

    /**
     * Add an event
     * @param req 
     * @param res 
     * @returns 
     */
    async addEvent(req: Request, res: Response) {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }

        this.eventService.setToken(token as string);

        const { user_email, name, date, location, description, time, sponsors} = req.body;

        if (!user_email || !name || !date || !location || !description || !time || !sponsors) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }



        const { lat, lon } = await geocodeAddress(location);
        const user_id = await this.userRoleService.getUserID(user_email);

        try {
            const event = await this.eventService.addEvent(user_id, name, date, location, description, lat, lon, time, sponsors);
            // res.json(event);
            res.json("Event added successfully");
            return;
        } catch (error) {
            res.status(500).json({ error: 'Failed to add event' });
        }
    }

    /**
     * Edit an event
     * @param req 
     * @param res 
     * @returns 
     */
    async editEvent(req: Request, res: Response) {
        const { event_id, name, date, location, description, time, sponsors} = req.body;

        const token = extractToken(req);
        
        if (!token) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }

        this.eventService.setToken(token as string);
        
        // Check for required fields
        if (!event_id) {
            res.status(400).json({ error: 'event_id is required.' });
            return;
        }
        
        // Build an update object only with non-empty fields
        const updateFields: Record<string, any> = {};
        if (name && name.trim() !== '') {
            updateFields.name = name;
        }
        if (date && date.trim() !== '') {
            updateFields.date = date;
        }
        if (location && location.trim() !== '') {
            updateFields.location = location;
            const { lat, lon } = await geocodeAddress(location);
            updateFields.location_lat = lat;
            updateFields.location_long = lon;
        }
        if (description && description.trim() !== '') {
            updateFields.description = description;
        }
        if (time && time.trim() !== '') {
            updateFields.time = time;
        }
        if (sponsors && sponsors.length > 0) {
            updateFields.sponsors = sponsors;
        }
        
        // If there's nothing to update, respond accordingly
        if (Object.keys(updateFields).length === 0) {
            res.status(400).json({ error: 'No valid update fields provided.' });
            return;
        }
        
        try {
            const updatedEvent = await this.eventService.editEvent(event_id, updateFields);
            if (!updatedEvent) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            res.json("Event updated successfully");
        } catch (error) {
            console.error('Error updating event:', error);
            res.status(500).json({ error: 'Server error.' });
        }
    }

    /**
     * Delete an event
     * @param req 
     * @param res 
     * @returns 
     */
    async deleteEvent(req: Request, res: Response) {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }

        this.eventService.setToken(token as string);

        const { event_id } = req.body;
        try {
            const event = await this.eventService.deleteEvent(event_id);
            res.json("Event deleted successfully");
        } catch (error) {
            if (error instanceof Error && error.message.includes('No event found')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Failed to delete event' });
            }
        }
    }


    // return all events (past and present given a date)
    async getEventsByDate(req: Request, res: Response) {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }

        this.eventService.setToken(token as string);

        const { date } = req.body;
        
        try {
            let events;
            if (date) {
                const formattedDate = new Date(date).toISOString().split('T')[0]; // YYYY-MM-DD
                events = await this.eventService.getEventsByDate(formattedDate);
            } else {
                // get today's date in YYYY-MM-DD format
                const today = new Date().toISOString().split('T')[0];
                events = await this.eventService.getEventsByDate(today);
            }
            res.json(events);
        } catch (error) {
            console.error('Error getting events:', error);
            res.status(500).json({ error: 'Failed to get events' });
        }
    }

    async verifyAttendance(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user?.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { eventId } = req.params;
            const { latitude, longitude, accuracy } = req.body;

            console.log('Verifying attendance for:', { user, eventId, location: { latitude, longitude, accuracy } });
            
            if (!latitude || !longitude) {
                console.error('Missing location data');
                return res.status(422).json({ error: 'Location data is required' });
            }

            if (accuracy > 100) {
                console.warn('Low accuracy location data:', { accuracy });
            }

            this.eventService.setToken(extractToken(req) as string);
            
            const result = await this.eventService.verifyLocationAttendance(
                eventId,
                user.id,
                latitude,
                longitude
            );
            
            console.log('Attendance verification result:', result);
            res.json({ message: result });
        } catch (error: any) {
            console.error('Check-in error:', error);
            
            if (error.message?.includes('too far')) {
                return res.status(422).json({ error: error.message });
            }
            if (error.message?.includes('already checked in')) {
                return res.status(409).json({ error: error.message });
            }
            if (error.message?.includes('Event not found')) {
                return res.status(404).json({ error: error.message });
            }
            
            res.status(500).json({ 
                error: error.message || 'Server error',
                details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
            });
        }
    }

    async rsvpForEvent(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user?.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { eventId } = req.params;
            
            try {
                const result = await this.eventService.rsvpForEvent(eventId, user.id);
                res.status(200).json({ message: result });
            } catch (error) {
                if (error instanceof Error && error.message === 'You have already RSVP\'d for this event') {
                    res.status(400).json({ error: error.message });
                } else {
                    console.error('Error processing RSVP:', error);
                    res.status(500).json({ error: 'Failed to process RSVP' });
                }
            }
        } catch (error) {
            console.error('Error in rsvpForEvent controller:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get public events (no auth required)
     * @param req 
     * @param res 
     * @returns 
     */
    async getPublicEvents(req: Request, res: Response) {
        try {
            console.log('Getting public events...');
            const events = await this.eventService.getPublicEvents();
            console.log('Public events retrieved:', events);
            res.json(events);
        } catch (error) {
            console.error('Error getting public events:', error);
            res.status(500).json({ error: 'Failed to get events' });
        }
    }


}