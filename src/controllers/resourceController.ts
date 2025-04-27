import { Request, Response } from 'express';
import { ResourceService } from '../services/resourceService';
import extractToken from '../utils/extractToken';

export class ResourceController {
  private resourceService: ResourceService;

  constructor() {
    this.resourceService = new ResourceService();
  }

  /**
   * Get all categories with their resources
   */
  async getAllResources(req: Request, res: Response) {
    try {
      const token = extractToken(req);
      if (token) {
        this.resourceService.setToken(token);
      }

      const resourceTree = await this.resourceService.getAllResources();
      res.status(200).json(resourceTree);
    } catch (error) {
      console.error('Error in getAllResources controller:', error);
      res.status(500).json({ error: 'Failed to retrieve resources' });
    }
  }

  /**
   * Add a new category
   */
  async addCategory(req: Request, res: Response) {
    try {
      const token = extractToken(req);
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      this.resourceService.setToken(token);

      const { name, description } = req.body;

      if (!name || !description) {
        res.status(400).json({ error: 'Name and description are required' });
        return;
      }

      const newCategory = await this.resourceService.addCategory(name, description);
      res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error in addCategory controller:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  }

  /**
   * Update an existing category
   */
  async updateCategory(req: Request, res: Response) {
    try {
      const token = extractToken(req);
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      this.resourceService.setToken(token);

      const { categoryId } = req.params;
      const { name, description } = req.body;

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      // At least one field must be provided for update
      if (!name && !description) {
        res.status(400).json({ error: 'At least one of name or description must be provided' });
        return;
      }

      const updateData: { name?: string; description?: string } = {};
      if (name) updateData.name = name;
      if (description) updateData.description = description;

      const updatedCategory = await this.resourceService.updateCategory(categoryId, updateData);
      res.status(200).json(updatedCategory);
    } catch (error) {
      console.error('Error in updateCategory controller:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(req: Request, res: Response) {
    try {
      const token = extractToken(req);
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      this.resourceService.setToken(token);

      const { categoryId } = req.params;

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      const result = await this.resourceService.deleteCategory(categoryId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in deleteCategory controller:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  }

  /**
   * Add a resource to a category
   */
  async addResource(req: Request, res: Response) {
    try {
      console.log('DEBUG - Controller: Starting addResource');
      const token = extractToken(req);
      if (!token) {
        console.log('DEBUG - Controller: No token found');
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      console.log('DEBUG - Controller: Token found, setting in service');
      this.resourceService.setToken(token);

      const { categoryId } = req.params;
      const { name, description } = req.body;
      const file = (req as any).file;

      console.log('DEBUG - Controller: Request params:', {
        categoryId,
        body: req.body,
        fileExists: !!file
      });

      if (!categoryId) {
        console.log('DEBUG - Controller: Missing categoryId');
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      if (!name || !description) {
        console.log('DEBUG - Controller: Missing name or description');
        res.status(400).json({ error: 'Name and description are required' });
        return;
      }

      if (!file) {
        console.log('DEBUG - Controller: Missing file');
        res.status(400).json({ error: 'File is required' });
        return;
      }

      console.log('DEBUG - Controller: Calling resourceService.addResource()');
      const newResource = await this.resourceService.addResource(categoryId, name, description, file);
      console.log('DEBUG - Controller: Resource created successfully');
      res.status(201).json(newResource);
    } catch (error) {
      console.error('DEBUG - Controller: Error in addResource controller:', error);
      
      // Log the full error details
      if (typeof error === 'object' && error !== null) {
        console.error('DEBUG - Controller: Error details:', JSON.stringify(error, null, 2));
      }
      
      if (error instanceof Error) {
        console.error('DEBUG - Controller: Error message:', error.message);
        console.error('DEBUG - Controller: Error stack:', error.stack);
        
        if (error.message.includes('not found')) {
          res.status(404).json({ 
            error: error.message,
            details: process.env.NODE_ENV !== 'production' ? error : undefined
          });
          return;
        }
      }
      
      res.status(500).json({ 
        error: 'Failed to create resource',
        details: process.env.NODE_ENV !== 'production' ? error : undefined
      });
    }
  }

  /**
   * Update a resource
   */
  async updateResource(req: Request, res: Response) {
    try {
      const token = extractToken(req);
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      this.resourceService.setToken(token);

      const { categoryId, resourceId } = req.params;
      const { name, description } = req.body;
      const file = (req as any).file; // Optional new file

      if (!categoryId || !resourceId) {
        res.status(400).json({ error: 'Category ID and Resource ID are required' });
        return;
      }

      // At least one field must be provided for update
      if (!name && !description && !file) {
        res.status(400).json({ error: 'At least one of name, description, or file must be provided' });
        return;
      }

      const updateData: { name?: string; description?: string } = {};
      if (name) updateData.name = name;
      if (description) updateData.description = description;

      const updatedResource = await this.resourceService.updateResource(categoryId, resourceId, updateData, file);
      res.status(200).json(updatedResource);
    } catch (error) {
      console.error('Error in updateResource controller:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update resource' });
      }
    }
  }

  /**
   * Delete a resource
   */
  async deleteResource(req: Request, res: Response) {
    try {
      const token = extractToken(req);
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      this.resourceService.setToken(token);

      const { categoryId, resourceId } = req.params;

      if (!categoryId || !resourceId) {
        res.status(400).json({ error: 'Category ID and Resource ID are required' });
        return;
      }

      const result = await this.resourceService.deleteResource(categoryId, resourceId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in deleteResource controller:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete resource' });
      }
    }
  }
} 