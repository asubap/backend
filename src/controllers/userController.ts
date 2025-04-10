import { Request, Response } from "express";
import extractToken from "../utils/extractToken";
import UserService from "../services/userService";

export default class UserController {
    private userService: UserService;
    /**
     * Constructor for the UserRoleController
     */
    constructor() {
        this.userService = new UserService();
    }

    async getAllUsers(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json('No authorization token provided');
                return;
            }

            this.userService.setToken(token as string);

            const users = await this.userService.getAllUsers();
            res.json(users);
        } catch (error) {
            console.error('Error getting users:', error);
            res.status(500).json('Failed to get users');
            return;
        }
    }

    async getUserRole(req: Request, res: Response) {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json('No authorization token provided');
                return;
            }

        this.userService.setToken(token as string); 
        const { user_email } = req.body;

        if (!user_email) {
            res.status(400).json('User email is required');
            return;
        }

        const userRole = await this.userService.getUserRole(user_email);
        res.json(userRole);
    } catch (error) {
            console.error('Error getting user role:', error);
            res.status(500).json('Failed to get user role');
            return;
        }
    }

    async addUser(req: Request, res: Response) {
        const token = extractToken(req);
        if (!token) {
            res.status(401).json('No authorization token provided');
            return;
        }

        this.userService.setToken(token as string);
        const { user_email, role } = req.body;

        if (!user_email || !role) {
            res.status(400).json('User email and role are required');
            return;
        }

        try {
            const newUser = await this.userService.addUser(user_email, role);
            res.status(200).json('User added successfully');
        } catch (error) {
            console.error('Error adding user:', error);
            res.status(500).json('Failed to add user');
            return;
        }
    }

    async deleteUser(req: Request, res: Response) {
        const token = extractToken(req);
        if (!token) {
            res.status(401).json('No authorization token provided');
            return;
        }
        
        this.userService.setToken(token as string);
        const { user_email } = req.body;

        if (!user_email) {
            res.status(400).json('User email is required' );
            return;
        }

        try {
            const deletedUser = await this.userService.deleteUser(user_email);
            
            res.status(200).json('User deleted successfully');
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json('Failed to delete user');
            return;
        }
    }

    async updateUserRole(req: Request, res: Response) {
        const token = extractToken(req);
        if (!token) {
            res.status(401).json('No authorization token provided');
            return;
        }

        this.userService.setToken(token as string);
        const { user_email, role } = req.body;

        if (!user_email || !role) {
            res.status(400).json('User email and role are required');
            return;
        }

        try {
            const updatedUser = await this.userService.updateRole(user_email, role);
            res.status(200).json("User updated successfully");
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json('Failed to update user');
        }
    }
    
}