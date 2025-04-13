import { Request, Response } from 'express';
import { SponsorService } from '../services/sponsorService';

// Get all sponsors
export const getAllSponsors = async (req: Request, res: Response): Promise<void> => {
  try {
    // Always use the default client (anon key) for this public route
    const sponsorService = new SponsorService();
    
    const sponsors = await sponsorService.getAllSponsors();
    res.status(200).json(sponsors);
  } catch (error) {
    console.error('Error fetching sponsors:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

// Get sponsor info by company name
export const getSponsorInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName } = req.params;
    if (!companyName) {
      res.status(400).json({ error: 'Company name is required' });
      return;
    }

    const sponsorService = new SponsorService();
    
    // Get token from request if available
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      sponsorService.setToken(token);
    }
    
    const sponsorInfo = await sponsorService.getSponsorInfo(companyName);
    res.status(200).json(sponsorInfo);
  } catch (error) {
    console.error('Error fetching sponsor info:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

// Get sponsor resources by company name
export const getSponsorResources = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName } = req.params;
    if (!companyName) {
      res.status(400).json({ error: 'Company name is required' });
      return;
    }

    const sponsorService = new SponsorService();
    
    // Get token from request if available
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      sponsorService.setToken(token);
    }
    
    const resources = await sponsorService.getSponsorResources(companyName);
    res.status(200).json(resources);
  } catch (error) {
    console.error('Error fetching sponsor resources:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

// Add a new resource for a sponsor
export const addSponsorResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName } = req.params;
    const { resourceLabel } = req.body;
    const file = (req as any).file;
    
    if (!companyName || !resourceLabel) {
      res.status(400).json({ error: 'Company name (in URL) and resource label (in body) are required' });
      return;
    }
    
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const sponsorService = new SponsorService();
    
    // Get token from request
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    sponsorService.setToken(token);
    
    const result = await sponsorService.addSponsorResource(companyName, resourceLabel, file);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding sponsor resource:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

// Delete a sponsor resource
export const deleteSponsorResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName } = req.params;
    const { resourceUrl } = req.body;
    
    if (!companyName || !resourceUrl) {
      res.status(400).json({ error: 'Company name and resource URL are required' });
      return;
    }

    const sponsorService = new SponsorService();
    
    // Get token from request
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    sponsorService.setToken(token);
    
    const result = await sponsorService.deleteSponsorResource(companyName, resourceUrl);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting sponsor resource:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

// Upload or update sponsor profile photo
export const uploadSponsorProfilePhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName } = req.params;
    const file = (req as any).file;
    
    if (!companyName) {
      res.status(400).json({ error: 'Company name is required' });
      return;
    }
    
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const sponsorService = new SponsorService();
    
    // Get token from request
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    sponsorService.setToken(token);
    
    const result = await sponsorService.uploadSponsorProfilePhoto(companyName, file);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error uploading sponsor profile photo:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

// Delete sponsor profile photo
export const deleteSponsorProfilePhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName } = req.params;
    
    if (!companyName) {
      res.status(400).json({ error: 'Company name is required' });
      return;
    }

    const sponsorService = new SponsorService();
    
    // Get token from request
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    sponsorService.setToken(token);
    
    const result = await sponsorService.deleteSponsorProfilePhoto(companyName);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting sponsor profile photo:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}; 