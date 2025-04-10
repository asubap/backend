import { Request, Response } from "express";
import { MemberInfoService } from "../services/memberInfoService";
import extractToken from "../utils/extractToken";
import UserRoleService from "../services/userRoleService";
export class MemberInfoController {
    private memberInfoService: MemberInfoService;
    private userRoleService: UserRoleService;

    constructor() {
        this.memberInfoService = new MemberInfoService();
        this.userRoleService = new UserRoleService();
    }


    /**
     * Get all member info
     * @param req 
     * @param res 
     * @returns information about all members
     */
    async getAllMemberInfo(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }

            this.memberInfoService.setToken(token);

            const memberInfo = await this.memberInfoService.getAllMemberInfo();
            // for the memberInfo, we need to convert the user_id to user_email
            const memberInfoWithEmail = await Promise.all(memberInfo.map(async (member) => {
                const user_email = await this.userRoleService.getUserEmail(member.user_id);
                return { ...member, user_email };
            }));

            res.status(200).json(memberInfoWithEmail);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get member info
     * @param req 
     * @param res 
     * @returns information about the member
     */
    async getMemberInfo(req: Request, res: Response) {
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

            const user_id = await this.userRoleService.getUserID(user_email);

            // get member info
            const memberInfo = await this.memberInfoService.getMemberInfo(user_id);

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
        const { user_email, about, internship_experience, first_name, last_name, year, major, contact_me, phone_number, graduation_year, member_status } = req.body;

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
        if (about && about.trim() !== '') {
            updateFields.about = about;
        }
        if (internship_experience && internship_experience.trim() !== '') {
            updateFields.internship_experience = internship_experience;
        }
        if (first_name && first_name.trim() !== '') {
            updateFields.first_name = first_name;
        }
        if (last_name && last_name.trim() !== '') {
            updateFields.last_name = last_name;
        }
        if (year && year.trim() !== '') {
            updateFields.year = year;
        }
        if (major && major.trim() !== '') {
            updateFields.major = major;
        }
        if (contact_me && contact_me.trim() !== '') {
            updateFields.contact_me = contact_me;
        }
        if (phone_number && phone_number.trim() !== '') {
            updateFields.phone_number = phone_number;
        }
        if (graduation_year && graduation_year.trim() !== '') {
            updateFields.graduation_year = graduation_year;
        }
        if (member_status && member_status.trim() !== '') {
            updateFields.member_status = member_status;
        }
        
        // If there's nothing to update, respond accordingly
        if (Object.keys(updateFields).length === 0) {
            res.status(400).json({ error: 'No valid update fields provided.' });
            return;
        }

        try {
            const user_id = await this.userRoleService.getUserID(user_email);
            // edit member info
            const memberInfo = await this.memberInfoService.editMemberInfo(user_id, updateFields);
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
     * Delete member
     * @param req 
     * @param res 
     * @returns the updated member info
     */
    async deleteMember(req: Request, res: Response) {
        try {
            const token = extractToken(req);

            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }

            this.memberInfoService.setToken(token);

            const { user_email } = req.body;
            
            if (!user_email) {
                res.status(400).json({ error: 'User email is required' });
                return;
            }

            const user_id = await this.userRoleService.getUserID(user_email);

            // delete member
            const memberInfo = await this.memberInfoService.deleteMember(user_id);
            if (!memberInfo) {
                res.status(404).json({ error: 'Member info not found.' });
                return;
            }

            res.status(200).json("Member deleted successfully");
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}