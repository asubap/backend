import express from 'express';
import { uploadProfilePhoto, getProfilePhoto, updateProfilePhoto, deleteProfilePhoto } from '../controllers/profilePhotoController';
import multer from 'multer';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Route for uploading profile photo with multer middleware
router.post('/upload', upload.single('file'), uploadProfilePhoto);

// Route for retrieving profile photo
router.get('/:userId', getProfilePhoto);

// Route for updating profile photo
router.put('/update', upload.single('file'), updateProfilePhoto);

// Route for deleting profile photo
router.delete('/:userId', deleteProfilePhoto);

export default router; 