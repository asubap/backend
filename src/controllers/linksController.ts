import { Request, Response } from 'express';
import { LinksService } from '../services/linksService';
import extractToken from "../utils/extractToken";

export class LinksController {
    private linksService: LinksService;

    constructor() {
        this.linksService = new LinksService();
    }

    async getLinks(req: Request, res: Response) {
        try {
            const { link_name } = req.query;
            if (!link_name || typeof link_name !== 'string') {
                return res.status(400).json({ error: 'Link name is required' });
            }

            const token = extractToken(req);
            if (token) {
                this.linksService.setToken(token);
            }
            
            const links = await this.linksService.getLinks(link_name);
            res.json(links);
        } catch (error) {
            console.error('Error getting links:', error);
            res.status(500).json({ error: 'Failed to get links' });
        }
    }

    async updateLink(req: Request, res: Response) {
        try {
            const { link_name, link } = req.body;
            if (!link_name || !link) {
                return res.status(400).json({ error: 'Link name and link are required' });
            }

            const token = extractToken(req);
            if (token) {
                this.linksService.setToken(token);
            }

            const updatedLink = await this.linksService.updateLink(link_name, link);
            res.json(updatedLink);
        } catch (error) {
            console.error('Error updating link:', error);
            res.status(500).json({ error: 'Failed to update link' });
        }
    }
} 