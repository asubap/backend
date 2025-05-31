import { Request, Response } from "express";
import extractToken from "../utils/extractToken";
import EboardService from "../services/eboardService";

export default class EboardController {
    private eboardService: EboardService;
    /**
     * Constructor for the EboardController
     */
    constructor() {
        this.eboardService = new EboardService();
    }

    async getEboard(req: Request, res: Response) {
        try {
            const users = await this.eboardService.getEboard();
            res.json(users);
        } catch (error) {
            console.error('Error getting users:', error);
            res.status(500).json('Failed to get users');
            return;
        }
    }

    async addEboard(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json('No authorization token provided');
                return;
            }

            this.eboardService.setToken(token as string);

            const { image, name, role, email, major, location } = req.body;
            
            if (!image || !name || !role || !email || !major || !location) {
                res.status(400).json('Missing required fields');
                return;
            }

            const eboard = await this.eboardService.addEboard(image, name, role, email, major, location);
            res.json(eboard);
        } catch (error) {
            console.error('Error adding eboard:', error);
            res.status(500).json('Failed to add eboard');
            return;
        }
    }
    
}