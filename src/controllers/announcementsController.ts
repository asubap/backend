import { Request, Response } from "express";
import extractToken from "../utils/extractToken";
import UserRoleService from "../services/userRoleService";
import { announcementsService } from "../services/announcementsService";

export class announcementsController {
    private announcementsService: announcementsService;
    private userRoleService: UserRoleService;

    constructor() {
        this.announcementsService = new announcementsService();
        this.userRoleService = new UserRoleService();
    }

    async getannouncements(req: Request, res: Response) {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }

        this.announcementsService.setToken(token as string);

        try {
            const announcements = await this.announcementsService.getannouncements();
            res.json(announcements);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            res.status(500).json({ error: 'Failed to fetch announcements' });
        }
    }

    async getannouncementByID(req: Request, res: Response) {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }

        this.announcementsService.setToken(token as string);
        try {
            const { announcement_id } = req.body;
            const announcements = await this.announcementsService.getannouncementByID(announcement_id);
            if (announcements.length === 0) {
                res.status(404).json({ error: 'Announcement not found' });
                return;
            }
            res.json(announcements);
        } catch (error) {
            console.error('Error fetching announcement:', error);
            res.status(500).json({ error: 'Failed to fetch announcement' });
        }
    }

    async addannouncements(req: Request, res: Response) {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }

        this.announcementsService.setToken(token as string);

        const { user_email, title, description} = req.body;

        if (!user_email || !title || !description) {
            res.status(400).json({ error: 'Missing required fields: user_email, title, and description' });
            return;
        }


        const user_id = await this.userRoleService.getUserID(user_email);

        try {
            const announcements = await this.announcementsService.addannouncements(user_id, title, description);
            res.json("Announcement added successfully");
        } catch (error) {
            res.status(500).json({ error: 'Failed to add announcements' });
        }
    }

    async editannouncements(req: Request, res: Response) {
        const { announcement_id, title, description } = req.body;

        const token = extractToken(req);
        
        if (!token) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }

        this.announcementsService.setToken(token as string);
        
        // Check for required fields
        if (!announcement_id) {
            res.status(400).json({ error: 'announcement_id is required.' });
            return;
        }
        
        // Build an update object only with non-empty fields
        const updateFields: Record<string, string> = {};
        if (title && title.trim() !== '') {
            updateFields.title = title;
        }
        if (description && description.trim() !== '') {
            updateFields.body = description;
        }
        
        // If there's nothing to update, respond accordingly
        if (Object.keys(updateFields).length === 0) {
            res.status(400).json({ error: 'No valid update fields provided.' });
            return;
        }
        
        try {
            const updatedAnnouncement = await this.announcementsService.editannouncements(announcement_id, updateFields);
            
            res.json(updatedAnnouncement);
        } catch (error) {
            console.error('Error updating announcement:', error);
            res.status(500).json({ error: 'Server error.' });
        }
    }

    async deleteannouncements(req: Request, res: Response) {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }

        this.announcementsService.setToken(token as string);

        const { announcement_id } = req.body;
        try {
            const announcement = await this.announcementsService.deleteannouncements(announcement_id);
            res.json("Announcement deleted successfully");
        } catch (error) {
            if (error instanceof Error && error.message.includes('No announcements found')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Failed to delete announcement' });
            }
        }
    }
}