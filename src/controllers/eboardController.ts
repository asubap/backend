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

    async addRole(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json('No authorization token provided');
                return;
            }

            this.eboardService.setToken(token as string);

            const { role, role_email, email, rank} = req.body;
            
            if (!role || !role_email || !email || !rank) {
                res.status(400).json('Missing required fields');
                return;
            }

            const result = await this.eboardService.addRole(role, role_email, email, rank);
            res.json(result);
        } catch (error) {
            console.error('Error adding role:', error);
            res.status(500).json('Failed to add role');
            return;
        }
    }

    async editRole(req: Request, res: Response) {
        const { role_email, role, email, rank } = req.body;
        
        if (!role_email) {
            res.status(400).json({ error: 'Role email is required' });
            return;
        }

        const token = extractToken(req);
        if (!token) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }

        this.eboardService.setToken(token);

        // Build an update object only with non-empty fields
        const updateFields: Record<string, any> = {};
        const validationErrors: string[] = [];

        // Role validation
        if (role !== undefined) {
            if (typeof role !== 'string') {
                validationErrors.push('Role must be a string');
            } else {
                const trimmedRole = role.trim();
                if (trimmedRole !== '') {
                    updateFields.role = trimmedRole;
                }
            }
        }
        
        // Email validation
        if (email !== undefined) {
            if (typeof email !== 'string') {
                validationErrors.push('Email must be a string');
            } else {
                const trimmedEmail = email.trim();
                if (trimmedEmail !== '') {
                    updateFields.email = trimmedEmail;
                }
            }
        }

        // Rank validation -> int type
        if (rank !== undefined) {
            if (typeof rank !== 'number') {
                validationErrors.push('Rank must be a number');
            } else {
                updateFields.rank = rank;
            }
        }
        // If there are validation errors, return them
        if (validationErrors.length > 0) {
            res.status(400).json({ 
                error: 'Validation failed',
                details: validationErrors
            });
            return;
        }

        // If there's nothing to update, respond accordingly
        if (Object.keys(updateFields).length === 0) {
            res.status(400).json({ error: 'No valid update fields provided.' });
            return;
        }

        try {
            const result = await this.eboardService.editRole(role_email, updateFields);
            if (!result) {
                res.status(404).json({ error: 'Role not found.' });
                return;
            }

            res.status(200).json("Role updated successfully");
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async deleteRole(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json('No authorization token provided');
                return;
            }

            this.eboardService.setToken(token as string);

            const { role_email } = req.body;
            
            if (!role_email) {
                res.status(400).json('role_email is required');
                return;
            }

            const result = await this.eboardService.deleteRole(role_email);
            res.json(result);
        } catch (error) {
            console.error('Error deleting role:', error);
            res.status(500).json('Failed to delete role');
            return;
        }
    }
}