import { Request, Response } from "express";
import extractToken from "../utils/extractToken";
import { EventService } from "../services/eventService";
import { geocodeAddress } from "../utils/geocoding";

export class EventController {
    private eventService: EventService;

    constructor() {
        this.eventService = new EventService();

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

        const { event_name, event_description, event_location, event_lat, event_long, event_date, event_time, event_hours, event_hours_type, sponsors_attending} = req.body;

        if (!event_name || !event_description || !event_location || !event_lat || !event_long || !event_date || !event_time || !event_hours || !event_hours_type || !sponsors_attending) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const { lat, lon } = await geocodeAddress(event_location);

        try {
            await this.eventService.addEvent(event_name, event_date, event_location, event_description, lat, lon, event_time, event_hours, event_hours_type, sponsors_attending);
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
        const { event_id, event_name, event_description, event_location, event_lat, event_long, event_date, event_time, event_hours, event_hours_type, sponsors_attending, event_rsvped, event_attending} = req.body;

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
        if (event_name && event_name.trim() !== '') {
            updateFields.event_name = event_name;
        }
        if (event_date && event_date.trim() !== '') {
            updateFields.event_date = event_date;
        }
        if (event_location && event_location.trim() !== '') {
            updateFields.event_location = event_location;
            const { lat, lon } = await geocodeAddress(event_location);
            updateFields.event_location_lat = lat;
            updateFields.event_location_long = lon;
        }
        if (event_description && event_description.trim() !== '') {
            updateFields.event_description = event_description;
        }
        if (event_time && event_time.trim() !== '') {
            updateFields.event_time = event_time;
        }
        if (sponsors_attending && sponsors_attending.length > 0) {
            updateFields.sponsors_attending = sponsors_attending;
        }
        if (event_rsvped && event_rsvped.length > 0) {
            updateFields.event_rsvped = event_rsvped;
        }
        if (event_attending && event_attending.length > 0) {
            updateFields.event_attending = event_attending;
        }
        if (event_hours && event_hours.trim() !== '') {
            updateFields.event_hours = event_hours;
        }
        if (event_hours_type && event_hours_type.trim() !== '') {
            updateFields.event_hours_type = event_hours_type;
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
            const { latitude, longitude, accuracy } = req.body;
            
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

    async unRsvpForEvent(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user?.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { eventId } = req.params;
            
            try {
                const result = await this.eventService.unRsvpForEvent(eventId, user.id);
                res.status(200).json({ message: result });
            } catch (error) {
                if (error instanceof Error && error.message === 'You have not RSVP\'d for this event') {
                    res.status(400).json({ error: error.message });
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


}