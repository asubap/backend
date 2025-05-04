import { Request, Response } from "express";
import { MemberInfoService } from "../services/memberInfoService";
import extractToken from "../utils/extractToken";   
export class MemberInfoController {
    private memberInfoService: MemberInfoService;

    constructor() {
        this.memberInfoService = new MemberInfoService();
    }


    async getAllMemberInfo(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }

            this.memberInfoService.setToken(token);

            const memberInfo = await this.memberInfoService.getAllMemberInfo();

            res.status(200).json(memberInfo);
        } catch (error) {
            res.status(500).json({ error: 'Couldn\'t get all member info' });
        }
    }


    async getMemberInfoByEmail(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }

            this.memberInfoService.setToken(token as string);

            // get member user_id
            const { user_email } = req.body;

            if (!user_email) {
                res.status(400).json({ error: 'User email is required' });
                return;
            }

            // get member info
            const memberInfo = await this.memberInfoService.getMemberInfo(user_email);

            res.status(200).json(memberInfo);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Edit member info
     * @param req 
     * @param res 
     * @returns the updated member info
     */
    async editMemberInfo(req: Request, res: Response) {
        console.log("editMemberInfo");
        const { user_email, name, major, about, graduating_year, links } = req.body;

        const token = extractToken(req);
        if (!token) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }

        this.memberInfoService.setToken(token);

        if (!user_email) {
            res.status(400).json({ error: 'User email is required' });
            return;
        }

        // Build an update object only with non-empty fields
        const updateFields: Record<string, string> = {};
        if (name && name.trim() !== '') {
            updateFields.name = name;
        }
        if (major && major.trim() !== '') {
            updateFields.major = major;
        }
        if (about && about.trim() !== '') {
            updateFields.about = about;
        }
        if (graduating_year && String(graduating_year).trim() !== '') {
            updateFields.graduating_year = graduating_year;
        }
        if (links) {
            updateFields.links = links;
        }
        
        // If there's nothing to update, respond accordingly
        if (Object.keys(updateFields).length === 0) {
            res.status(400).json({ error: 'No valid update fields provided.' });
            return;
        }


        try {
            // edit member info
            const memberInfo = await this.memberInfoService.editMemberInfo(user_email, updateFields);
            if (!memberInfo) {
                res.status(404).json({ error: 'Member info not found.' });
                return;
            }

            res.status(200).json("Member info updated successfully");
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Upload/Update profile photo for a member
     * @param req - The request object
     * @param res - The response object
     */
    async uploadProfilePhoto(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }

            this.memberInfoService.setToken(token);

            // Get email from URL parameter
            const { email } = req.params;
            if (!email) {
                res.status(400).json({ error: 'Email parameter is required' });
                return;
            }

            // Get the uploaded file (handled by multer middleware)
            const file = (req as any).file;
            if (!file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            const result = await this.memberInfoService.uploadProfilePhoto(email, file);
            res.status(200).json(result);
        } catch (error) {
            console.error('Error uploading profile photo:', error);
            res.status(500).json({ error: (error as Error).message || 'Internal server error' });
        }
    }

    /**
     * Delete profile photo for a member
     * @param req - The request object 
     * @param res - The response object
     */
    async deleteProfilePhoto(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }

            this.memberInfoService.setToken(token);

            // Get email from URL parameter
            const { email } = req.params;
            if (!email) {
                res.status(400).json({ error: 'Email parameter is required' });
                return;
            }

            const result = await this.memberInfoService.deleteProfilePhoto(email);
            res.status(200).json(result);
        } catch (error) {
            console.error('Error deleting profile photo:', error);
            res.status(500).json({ error: (error as Error).message || 'Internal server error' });
        }
    }
}