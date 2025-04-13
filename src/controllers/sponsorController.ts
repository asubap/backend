import { Request, Response } from "express";
import extractToken from "../utils/extractToken";
import UserService from "../services/userService";
import { SponsorService } from "../services/sponsorService";
import bcrypt from "bcryptjs"; // Changed from bcrypt to bcryptjs
export default class SponsorController {
    private sponsorService: SponsorService;
    /**
     * Constructor for the UserRoleController
     */
    constructor() {
        this.sponsorService = new SponsorService();
    }

    async addSponsor(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json('No authorization token provided');
                return;
            }

            this.sponsorService.setToken(token as string);

            const { sponsor_name, passcode, emailList } = req.body;

            if (!sponsor_name || !passcode || !emailList) {
                res.status(400).json('Sponsor name, passcode and email list are required');
                return;
            }
            if (!Array.isArray(emailList)) {
                res.status(400).json('Email list must be an array');
                return;
            }
            if (emailList.length === 0) {
                res.status(400).json('Email list cannot be empty');
                return;
            }
            // Check if the user is a sponsor
            // Ensure passcode is converted to string before hashing
            //hash passcode
            const hashedPasscode = await bcrypt.hash(passcode, 10);
            //check and compare with hashcode in database
            // const isMatch = await bcrypt.compare(passcode, "your_hashed-passcode");

            // Use the sponsor service
            const sponsors = {sponsor_name, hashedPasscode, emailList};
            //to check if hash is right
            // const sponsors = {sponsor_name, isMatch, emailList};

            // Send success response
            res.status(200).json({ message: 'Sponsors added successfully', sponsors });
            
        } catch (error) {
            console.error('Error adding sponsor:', error);
            res.status(500).json('Failed to add sponsor');
            return;
        }
    }
}