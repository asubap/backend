import { Router } from 'express';
import multer from 'multer';
import { verifySupabaseToken } from '../middleware/verifySupabaseToken';
import { ResourceController } from '../controllers/resourceController';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

const controller = new ResourceController();
const router = Router();

// Resource routes
router
// GET /resources - Get the full resource tree
.get('/', controller.getAllResources.bind(controller))

// POST /resources/add-category - Create a new category
.post('/add-category', verifySupabaseToken, controller.addCategory.bind(controller))

// POST /resources/:categoryId/update - Update a category
.post('/:categoryId/update', verifySupabaseToken, controller.updateCategory.bind(controller))

// POST /resources/:categoryId/delete - Delete a category
.post('/:categoryId/delete', verifySupabaseToken, controller.deleteCategory.bind(controller))

// POST /resources/:categoryId/resources - Add a resource to a category
.post(
  '/:categoryId/resources',
  verifySupabaseToken,
  upload.single('file'), // Expect a file with field name 'file'
  controller.addResource.bind(controller)
)

// POST /resources/:categoryId/resources/:resourceId/update - Update a resource
.post(
  '/:categoryId/resources/:resourceId/update',
  verifySupabaseToken,
  upload.single('file'), // Optional file
  controller.updateResource.bind(controller)
)

// POST /resources/:categoryId/resources/:resourceId/delete - Delete a resource
.post(
  '/:categoryId/resources/:resourceId/delete',
  verifySupabaseToken,
  controller.deleteResource.bind(controller)
);

export default router; 