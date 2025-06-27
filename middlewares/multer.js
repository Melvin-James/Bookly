const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

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

module.exports = uploadTo;

