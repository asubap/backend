import { Request, Response } from 'express';
import { SponsorService } from '../services/sponsorService';
import extractToken from "../utils/extractToken";  
import { passcodeHash } from '../utils/passcode'; 
import bcrypt from 'bcryptjs';
import sgMail from '@sendgrid/mail';
import { generateSupabaseToken } from '../services/jwtService';
export class SponsorController {
  private sponsorService: SponsorService;
  private sendgridApiKey: string = process.env.SENDGRID_API_KEY || '';

  constructor() {
    this.sponsorService = new SponsorService();
    sgMail.setApiKey(this.sendgridApiKey);

  }

  async getSponsorNames(req: Request, res: Response): Promise<void> {
    try {
      const names = await this.sponsorService.getSponsorNames();
      res.status(200).json(names);
    } catch (error) {
      console.error('Error fetching sponsor names:', error);
      res.status(500).json({ error: (error as Error).message });
    }
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
        //"$2b$10$siwRx21fFrmlJeJDOR.Icesb6QYHdXtewWoBV9HUTilh6yQb2LBnG"
        const hashedPasscode = await bcrypt.hash(passcode, 10);
        //check and compare with hashcode in database
        //const isMatch = await bcrypt.compare(passcode, "$2b$10$yeyihth2a3iJyIYoukurKujALO.r0rzZriWmYz4aYvVQhZnz67vJi");

        // Use the sponsor service
        await this.sponsorService.addSponsor(sponsor_name, hashedPasscode, emailList);
        
        // Send invitation emails to all recipients in emailList with the original passcode
        try {
          await this.sponsorService.sendSponsorInvitations(sponsor_name, passcode, emailList);
        } catch (emailError) {
          console.error('Failed to send some invitation emails:', emailError);
          // Continue with the response even if some emails fail
        }
        
        const sponsors = {sponsor_name, emailList};
        
        // Send success response
        res.status(200).json({ 
          message: 'Sponsors added successfully', 
          sponsors,
          emailsSent: true
        });
        
    } catch (error) {
        console.error('Error adding sponsor:', error);
        res.status(500).json('Failed to add sponsor');
        return;
    }
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

  // Sponsor auth
  // async sponsorAuth(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { companyName, passcode } = req.body;
  //     const sponsorService = new SponsorService();
  //     const result = await sponsorService.sponsorAuth(companyName, passcode);

  //     if (!result) {
  //       res.status(401).json({ error: 'Invalid passcode' });
  //       return;
  //     }

  //     // check if passcode_hash is correct
  //     const isMatch = await bcrypt.compare(passcode, result);
  //     if (!isMatch) {
  //       res.status(401).json({ error: 'Invalid passcode' });
  //       return;
  //     }
  //     // generate token
  //     const token = generateSupabaseToken(companyName);
  //     res.status(200).json({ token });
  //   } catch (error) {
  //     console.error('Error authenticating sponsor:', error);
  //     res.status(500).json({ error: (error as Error).message });
  //   }
  // }
  
}