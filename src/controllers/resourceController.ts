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
      const token = extractToken(req);
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      this.resourceService.setToken(token);

      const { categoryId } = req.params;
      const { name, description } = req.body;
      const file = (req as any).file;

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      if (!name || !description) {
        res.status(400).json({ error: 'Name and description are required' });
        return;
      }

      if (!file) {
        res.status(400).json({ error: 'File is required' });
        return;
      }

      const newResource = await this.resourceService.addResource(categoryId, name, description, file);
      res.status(201).json(newResource);
    } catch (error) {
      console.error('Error in addResource controller:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create resource' });
      }
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