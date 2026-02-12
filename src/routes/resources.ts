import { Router } from 'express';
import multer from 'multer';
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

// Resource routes - auth stripped for testing
router
// GET /resources - Public access
.get('/', controller.getAllResources.bind(controller))

// Category management
.post('/add-category', controller.addCategory.bind(controller))
.post('/:categoryId/update', controller.updateCategory.bind(controller))
.post('/:categoryId/delete', controller.deleteCategory.bind(controller))

// Resource management
.post(
  '/:categoryId/resources',
  upload.single('file'),
  controller.addResource.bind(controller)
)
.post(
  '/:categoryId/resources/:resourceId/update',
  upload.single('file'),
  controller.updateResource.bind(controller)
)
.post(
  '/:categoryId/resources/:resourceId/delete',
  controller.deleteResource.bind(controller)
);

export default router;
