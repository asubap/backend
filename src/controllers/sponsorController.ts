import { Request, Response } from 'express';
import { SponsorService } from '../services/sponsorService';
import extractToken from "../utils/extractToken";  
import { passcodeHash } from '../utils/passcode'; 

export class SponsorController {
  private sponsorService: SponsorService;

  constructor() {
    this.sponsorService = new SponsorService();
  }

  // Get all sponsors
  async getAllSponsors(req: Request, res: Response): Promise<void> {
    try {
      const sponsors = await this.sponsorService.getAllSponsors();
      res.status(200).json(sponsors);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };

  // Add a new sponsor
  async addSponsor(req: Request, res: Response) {
    try {
      const { sponsor, passcode, emails } = req.body;
      if (!sponsor || !passcode || !emails) {
        res.status(400).json({ error: 'Sponsor, passcode, and emails are required' });
        return;
      }

      const token = extractToken(req);

      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      this.sponsorService.setToken(token);

      // hash passcode and store
      const passcode_hash: string = await passcodeHash(passcode);

      await this.sponsorService.addSponsor(sponsor, passcode_hash, emails);
      res.json("Sponsor added successfully");
    } catch (error) {
      console.error('Error adding sponsor:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getSponsorByPasscode(req: Request, res: Response): Promise<void> {
    try {
      const { passcode } = req.body;
      if (!passcode) {
        res.status(400).json({ error: 'Passcode is required' });
        return;
      }
      const sponsorService = new SponsorService();

      const passcode_hash: string = await passcodeHash(passcode);

      const sponsor = await sponsorService.getSponsorByPasscode(passcode_hash);
      if (!sponsor) {
        res.status(404).json({ error: 'Sponsor not found' });
        return;
      }
      res.status(200).json(sponsor);
    } catch (error) {
      console.error('Error fetching sponsor by passcode:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };


  // Get sponsor resources by passcode
  async getSponsorResources(req: Request, res: Response): Promise<void> {
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
  async addSponsorResource(req: Request, res: Response): Promise<void> {
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
  async deleteSponsorResource(req: Request, res: Response): Promise<void> {
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
  async uploadSponsorProfilePhoto(req: Request, res: Response): Promise<void> {
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
  async deleteSponsorProfilePhoto(req: Request, res: Response): Promise<void> {
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

  // Update sponsor details (about, links)
  async updateSponsorDetails(req: Request, res: Response): Promise<void> {
    try {
      const { passcode, about, links} = req.body as {
        passcode: string;
        about?: string;
        links?: string[] | string;
      };

      if (!passcode) {
        res.status(400).json({ error: 'Passcode is required' });
        return;
      }

      const passcode_hash = await passcodeHash(passcode);

      const updateFields: { about?: string; links?: string[] } = {};
      if (about && about.trim() !== '') {
        updateFields.about = about;
      }
      if (links && Array.isArray(links) && links.length > 0) {
        updateFields.links = links;
      }

      this.sponsorService.updateSponsorDetails(passcode_hash, updateFields)
        .then(() => {
          res.status(200).json({ message: 'Sponsor details updated successfully' });
        })
    } catch (error) {
      console.error('Error updating sponsor details:', error);
      if (error instanceof Error) {
          // Use specific error messages from the service or a generic one
          if (error.message.includes('not found') || error.message.includes('No update data') || error.message.includes('must be an array') || error.message.includes('must be strings') || error.message.includes('must be a string')) {
              res.status(400).json({ error: error.message });
          } else {
              res.status(500).json({ error: 'Failed to update sponsor details.' });
          }
      } else {
          res.status(500).json({ error: 'An unexpected error occurred.' });
      }
    }
  }; 
}