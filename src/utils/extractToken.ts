import { Request } from "express";

/**
     * Extract the token from the request
     * @param req - The request object
     * @returns The token or null if no token is provided
     */
export default function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    
    return parts[1];
}