const multer = require('multer');
const path = require('path');
const fs = require('fs');

const getStorage = (folderName) => multer.diskStorage({
  destination: function (req, file, cb) {
    const fullPath = path.join(__dirname,'../public/uploads',folderName);
    fs.mkdirSync(fullPath,{recursive:true});
    console.log('Uploading to:',fullPath);
    cb(null,fullPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'userImage-' + uniqueSuffix + ext);
  }
});


const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, JPG, WEBP images are allowed'), false);
  }
};


const uploadTo = (folderName) => multer({ storage: getStorage(folderName), fileFilter });

module.exports = uploadTo;