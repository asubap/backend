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

            console.log("Getting all member info");

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

            console.log("User email: ", user_email);
            // get member info
            const memberInfo = await this.memberInfoService.getMemberInfo(user_email);
            console.log("Member info: ", memberInfo);

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
        if (graduating_year && graduating_year.trim() !== '') {
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
            console.log("Member info: ", memberInfo);
            if (!memberInfo) {
                res.status(404).json({ error: 'Member info not found.' });
                return;
            }

            res.status(200).json("Member info updated successfully");
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}