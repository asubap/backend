import { Request, Response } from "express";
import extractToken from "../utils/extractToken";
import { EventService } from "../services/eventService";
import { geocodeAddress } from "../utils/geocoding";
import UserService from "../services/userService";

export class EventController {
    private eventService: EventService;
    private userService: UserService;

    constructor() {
        this.eventService = new EventService();
        this.userService = new UserService();

    }

    /**
     * Get all events
     * @param req 
     * @param res 
     * @returns 
     */
    async getEvents(req: Request, res: Response) {
        try {
            const token = extractToken(req);

            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }
            this.eventService.setToken(token as string);

            const events = await this.eventService.getEvents();
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
     * Send event to all members
     * @param req 
     * @param res 
     * @returns 
     */
    async sendEvent(req: Request, res: Response) {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }

        this.eventService.setToken(token as string);

        const { event_name, event_description, event_location, event_lat, event_long, event_date, event_time, event_hours, event_hours_type, sponsors_attending, rsvped_users } = req.body;

        if (!event_name || !event_description || !event_location || !event_lat || !event_long || !event_date || !event_time || !event_hours || !event_hours_type || !sponsors_attending || !rsvped_users) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        try {
            await this.eventService.sendEvent(event_name, event_date, event_location, event_description, event_time, event_hours, event_hours_type, sponsors_attending, rsvped_users);
            res.json("Event send successfully");
            return;
        } catch (error) {
            res.status(500).json({ error: 'Failed to add event' });
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

        const { event_name, event_description, event_location, event_lat, event_long, event_date, event_time, event_hours, event_hours_type, sponsors_attending, check_in_window, check_in_radius, event_limit} = req.body;

        if (!event_name || !event_description || !event_location || !event_lat || !event_long || !event_date || !event_time || !event_hours || !event_hours_type || !sponsors_attending || !check_in_window || !check_in_radius || !event_limit) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }


        try {
            await this.eventService.addEvent(event_name, event_date, event_location, event_description, event_lat, event_long, event_time, event_hours, event_hours_type, sponsors_attending, check_in_window, check_in_radius, event_limit);
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
        const { event_id, name, date, location, description, time, sponsors, event_hours, event_hours_type, check_in_window, check_in_radius, event_limit} = req.body;

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
            updateFields.event_name = name;
        }
        if (date && date.trim() !== '') {
            updateFields.event_date = date;
        }
        if (location) {
            if (location.name && location.name.trim() !== '') {
                updateFields.event_location = location.name;
            }
            if (typeof location.latitude === 'number') {
                updateFields.event_lat = location.latitude;
            }
            if (typeof location.longitude === 'number') {
                updateFields.event_long = location.longitude;
            }
        }
        if (description && description.trim() !== '') {
            updateFields.event_description = description;
        }
        if (time && time.trim() !== '') {
            updateFields.event_time = time;
        }
        if (sponsors !== undefined) {
            updateFields.sponsors_attending = sponsors;
        }
        if (event_hours) {
            updateFields.event_hours = event_hours;
        }
        if (event_hours_type && event_hours_type.trim() !== '') {
            updateFields.event_hours_type = event_hours_type;
        }

        // convert check_in_window from string to number
        if (check_in_window && typeof check_in_window === 'string') {
            updateFields.check_in_window = parseInt(check_in_window);
        }

        // convert check_in_radius from string to number
        if (check_in_radius && typeof check_in_radius === 'string') {
            updateFields.check_in_radius = parseInt(check_in_radius);
        }

        if (event_limit && typeof event_limit === 'number') {
            updateFields.event_limit = event_limit;
        }
        
        // If there's nothing to update, respond accordingly
        if (Object.keys(updateFields).length === 0) {
            res.status(400).json({ error: 'No valid update fields provided.' });
            return;
        }
        
        try {
            await this.eventService.editEvent(event_id, updateFields);
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

    async verifyAttendance(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user?.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { eventId } = req.params;
            const { latitude, longitude, accuracy} = req.body;
            
            if (!latitude || !longitude) {
                console.error('Missing user location data');
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

            if (error.message?.includes('You have not RSVP\'d for this event')) {
                return res.status(400).json({ error: error.message });
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
            const { user_email } = req.body;

            // find user_id if the user_email is provided
            let user_id = user.id;
            if (user_email) {
                console.log("user_email", user_email);
                // this could be optimized
                user_id = await this.userService.getUserIdByEmail(user_email);
            }
            
            try {
                const result = await this.eventService.rsvpForEvent(eventId, user_id);
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

    async unRsvpForEvent(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user?.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { eventId } = req.params;
            const { user_email } = req.body;

            // find user_id if the user_email is provided
            let user_id = user.id;
            if (user_email) {
                console.log("user_email", user_email);
                user_id = await this.userService.getUserIdByEmail(user_email);
            }
            
            try {
                const result = await this.eventService.unRsvpForEvent(eventId, user_id);
                res.status(200).json({ message: result });
            } catch (error) {
                if (error instanceof Error && error.message === 'You have not RSVP\'d for this event') {
                    res.status(400).json({ error: error.message });
                } else if (error instanceof Error && error.message === 'Member not found') {
                    res.status(404).json({ error: error.message });
                } else {
                    console.error('Error processing un-RSVP:', error);
                    res.status(500).json({ error: 'Failed to process RSVP' });
                }
            }
        } catch (error) {
            console.error('Error in unRsvpForEvent controller:', error);
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
            const events = await this.eventService.getPublicEvents();
            res.json(events);
        } catch (error) {
            console.error('Error getting public events:', error);
            res.status(500).json({ error: 'Failed to get events' });
        }
    }

    async addMemberAttending(req: Request, res: Response) {
        try {
            const token = extractToken(req);

            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }

            this.eventService.setToken(token as string);

            const { eventId, userEmail } = req.body;

            if (!eventId || !userEmail) {
                res.status(400).json({ error: 'Missing required fields: eventId and userEmail' });
                return;
            }

            const user_id = await this.userService.getUserIdByEmail(userEmail);
            const result = await this.eventService.addMemberAttending(eventId, user_id);
            res.json({ message: result });
        } catch (error: any) {
            console.error('Error adding member to event:', error);
            
            if (error.message?.includes('User not found')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message?.includes('already attending')) {
                return res.status(409).json({ error: error.message });
            }
            
            res.status(500).json({ 
                error: error.message || 'Server error',
                details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
            });
        }
    }

    async deleteMemberAttending(req: Request, res: Response) {
        try {
            const token = extractToken(req);

            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }

            this.eventService.setToken(token as string);

            const { eventId, userEmail } = req.body;

            if (!eventId || !userEmail) {
                res.status(400).json({ error: 'Missing required fields: eventId and userEmail' });
                return;
            }
            const user_id = await this.userService.getUserIdByEmail(userEmail);
            const result = await this.eventService.deleteMemberAttending(eventId, user_id);
            res.json({ message: result });
        } catch (error: any) {
            console.error('Error removing member from event:', error);
            
            if (error.message?.includes('User not found')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message?.includes('not attending')) {
                return res.status(409).json({ error: error.message });
            }
            
            res.status(500).json({ 
                error: error.message || 'Server error',
                details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
            });
        }
    }

}