import { Router } from 'express';
import multer from 'multer';
import { verifySupabaseToken } from '../middleware/verifySupabaseToken';
import { requireEBoard } from '../middleware/requireRole';
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
// GET /resources - Public access (no auth required)
.get('/', controller.getAllResources.bind(controller))

// Category management - E-BOARD ONLY
.post('/add-category', verifySupabaseToken, requireEBoard, controller.addCategory.bind(controller))
.post('/:categoryId/update', verifySupabaseToken, requireEBoard, controller.updateCategory.bind(controller))
.post('/:categoryId/delete', verifySupabaseToken, requireEBoard, controller.deleteCategory.bind(controller))

// Resource management - E-BOARD ONLY
.post(
  '/:categoryId/resources',
  verifySupabaseToken,
  requireEBoard,
  upload.single('file'),
  controller.addResource.bind(controller)
)
.post(
  '/:categoryId/resources/:resourceId/update',
  verifySupabaseToken,
  requireEBoard,
  upload.single('file'),
  controller.updateResource.bind(controller)
)
.post(
  '/:categoryId/resources/:resourceId/delete',
  verifySupabaseToken,
  requireEBoard,
  controller.deleteResource.bind(controller)
);

export default router; 