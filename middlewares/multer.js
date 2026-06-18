import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const getCloudStorage = (folderName) =>
  new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `bookly/${folderName}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    },
  });

const uploadTo = (folderName) =>
  multer({ storage: getCloudStorage(folderName) });

export default uploadTo;

