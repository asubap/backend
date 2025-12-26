import { Request, Response } from "express";
import { MemberInfoService } from "../services/memberInfoService";
import extractToken from "../utils/extractToken";
import { isValidRank, normalizeRank } from "../utils/permissions";   
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

    /**
     * Get current authenticated user's member info
     * Uses email from JWT token attached by verifySupabaseToken middleware
     * @param req - Request object with authenticated user
     * @param res - Response object
     */
    async getCurrentUserMemberInfo(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }

            // Get user email from JWT (set by verifySupabaseToken middleware)
            const user = (req as any).user;
            if (!user || !user.email) {
                res.status(401).json({ error: 'User email not found in token' });
                return;
            }

            this.memberInfoService.setToken(token);

            // Fetch only current user's member info
            const memberInfo = await this.memberInfoService.getMemberByEmail(user.email);

            if (!memberInfo) {
                res.status(404).json({ error: 'Member info not found for current user' });
                return;
            }

            // Return minimal response with just the rank
            res.status(200).json({
                rank: memberInfo.rank,
                user_email: memberInfo.user_email
            });
        } catch (error) {
            console.error('Error getting current user member info:', error);
            res.status(500).json({ error: 'Failed to get current user member info' });
        }
    }

    /**
     * Get all alumni members
     * Filtered at database level for performance
     */
    async getAlumniMembers(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }

            this.memberInfoService.setToken(token);

            const alumniMembers = await this.memberInfoService.getAlumniMembers();

            res.status(200).json(alumniMembers);
        } catch (error) {
            console.error('Error getting alumni members:', error);
            res.status(500).json({ error: 'Failed to get alumni members' });
        }
    }

    /**
     * Get all active (non-alumni) members
     * Filtered at database level for performance
     */
    async getActiveMembers(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }

            this.memberInfoService.setToken(token);

            const activeMembers = await this.memberInfoService.getActiveMembers();

            res.status(200).json(activeMembers);
        } catch (error) {
            console.error('Error getting active members:', error);
            res.status(500).json({ error: 'Failed to get active members' });
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
        const { user_email, name, major, about, graduating_year, phone, member_status, member_rank, development_hours, professional_hours, service_hours, social_hours, links } = req.body;

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
        const updateFields: Record<string, any> = {};
        const validationErrors: string[] = [];

        // Text fields validation
        if (name !== undefined) {
            if (typeof name !== 'string') {
                validationErrors.push('Name must be a string');
            } else {
                const trimmedName = name.trim();
                if (trimmedName !== '') {
                    updateFields.name = trimmedName;
                }
            }
        }

        if (major !== undefined) {
            if (typeof major !== 'string') {
                validationErrors.push('Major must be a string');
            } else {
                const trimmedMajor = major.trim();
                if (trimmedMajor !== '') {
                    updateFields.major = trimmedMajor;
                }
            }
        }

        if (about !== undefined) {
            if (typeof about !== 'string') {
                validationErrors.push('About must be a string');
            } else {
                const trimmedAbout = about.trim();
                if (trimmedAbout !== '') {
                    updateFields.about = trimmedAbout;
                }
            }
        }

        if (phone !== undefined) {
            if (typeof phone !== 'string') {
                validationErrors.push('Phone must be a string');
            } else {
                const trimmedPhone = phone.trim();
                if (trimmedPhone !== '') {
                    updateFields.phone = trimmedPhone;
                }
            }
        }

        if (member_status !== undefined) {
            if (typeof member_status !== 'string') {
                validationErrors.push('Member status must be a string');
            } else {
                const trimmedStatus = member_status.trim();
                if (trimmedStatus !== '') {
                    updateFields.member_status = trimmedStatus;
                }
            }
        }

        // Numeric fields validation
        if (graduating_year !== undefined) {
            if (typeof graduating_year !== 'number' && isNaN(Number(graduating_year))) {
                validationErrors.push('Graduating year must be a number');
            } else {
                const year = Number(graduating_year);
                if (!isNaN(year)) {
                    updateFields.graduating_year = year;
                }
            }
        }

        if (development_hours !== undefined) {
            if (typeof development_hours !== 'number' && isNaN(Number(development_hours))) {
                validationErrors.push('Development hours must be a number');
            } else {
                const hours = Number(development_hours);
                if (isNaN(hours)) {
                    validationErrors.push('Development hours must be a valid number');
                } else if (hours < 0) {
                    validationErrors.push('Development hours cannot be negative');
                } else {
                    updateFields.development_hours = hours;
                }
            }
        }

        if (professional_hours !== undefined) {
            if (typeof professional_hours !== 'number' && isNaN(Number(professional_hours))) {
                validationErrors.push('Professional hours must be a number');
            } else {
                const hours = Number(professional_hours);
                if (isNaN(hours)) {
                    validationErrors.push('Professional hours must be a valid number');
                } else if (hours < 0) {
                    validationErrors.push('Professional hours cannot be negative');
                } else {
                    updateFields.professional_hours = hours;
                }
            }
        }

        if (service_hours !== undefined) {
            if (typeof service_hours !== 'number' && isNaN(Number(service_hours))) {
                validationErrors.push('Service hours must be a number');
            } else {
                const hours = Number(service_hours);
                if (isNaN(hours)) {
                    validationErrors.push('Service hours must be a valid number');
                } else if (hours < 0) {
                    validationErrors.push('Service hours cannot be negative');
                } else {
                    updateFields.service_hours = hours;
                }
            }
        }

        if (social_hours !== undefined) {
            if (typeof social_hours !== 'number' && isNaN(Number(social_hours))) {
                validationErrors.push('Social hours must be a number');
            } else {
                const hours = Number(social_hours);
                if (isNaN(hours)) {
                    validationErrors.push('Social hours must be a valid number');
                } else if (hours < 0) {
                    validationErrors.push('Social hours cannot be negative');
                } else {
                    updateFields.social_hours = hours;
                }
            }
        }

        // Rank validation
        if (member_rank !== undefined) {
            if (typeof member_rank !== 'string') {
                validationErrors.push('Rank must be a string');
            } else {
                const trimmedRank = member_rank.trim();
                if (trimmedRank !== '') {
                    // Validate rank is one of: pledge, inducted, alumni
                    if (!isValidRank(trimmedRank)) {
                        validationErrors.push('Rank must be: pledge, inducted, or alumni');
                    } else {
                        // Normalize to lowercase for consistency
                        updateFields.rank = normalizeRank(trimmedRank);
                    }
                }
            }
        }

        // Links array validation
        if (links !== undefined) {
            if (!Array.isArray(links)) {
                validationErrors.push('Links must be an array');
            } else {
                const invalidLinks = links.filter(link => typeof link !== 'string' || link.trim() === '');
                if (invalidLinks.length > 0) {
                    validationErrors.push('All links must be non-empty strings');
                } else {
                    const validLinks = links.map(link => link.trim());
                    if (validLinks.length > 0) {
                        updateFields.links = validLinks;
                    }
                }
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

    /**
     * Get event attendance for a member
     * @param req 
     * @param res 
     * @returns array of events the member attended
     */
    async getEventAttendance(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json({ error: 'No authorization token provided' });
                return;
            }

            this.memberInfoService.setToken(token as string);

            const { user_email } = req.body;

            if (!user_email) {
                res.status(400).json({ error: 'User email is required' });
                return;
            }

            const eventAttendance = await this.memberInfoService.getEventAttendance(user_email);
            res.status(200).json(eventAttendance);
        } catch (error) {
            console.error('Error getting event attendance:', error);
            res.status(500).json({ error: 'Failed to get event attendance' });
        }
    }
}