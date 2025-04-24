const express = require('express');
const router = express.Router();
const userControllers=require('../controllers/user/userControllers');
const homeControllers = require('../controllers/user/homeControllers');
const profileControllers = require('../controllers/user/profileControllers')
const {userAuth,adminAuth}=require('../middlewares/auth');
const uploadTo=require('../middlewares/multer')
const uploadProfileImage = uploadTo('profileImages');

router.get('/signup',userControllers.loadSignup);
router.post('/signup', uploadProfileImage.single('userImage'), userControllers.signupStep1);
router.post('/address', userControllers.signupStep2);
router.post('/verify-otp', userControllers.verifyOtp);


router.get('/home',userAuth,userControllers.homePage);

router.post('/resendOtp',userControllers.resendOtp);

router.get('/login',userControllers.loadLogin);
router.post('/login',userControllers.login);

router.get('/forgot-password',userControllers.loadForgotPassword);
router.post('/forgot-password',userControllers.forgotPassword);

router.get('/reset-password',userControllers.loadResetPassword);
router.post('/reset-password',userControllers.resetPassword);

router.get('/logout',userAuth,userControllers.logout);


router.get('/product-details/:id',userAuth,homeControllers.getProductDetails);

router.get('/shop',userAuth,homeControllers.getShopProducts);

router.get('/profile',userAuth,profileControllers.getProfilePage);
router.get('/profile/edit',userAuth,profileControllers.getEditProfile);
router.post('/profile/edit',userAuth,uploadProfileImage.single('userImage'),profileControllers.postEditProfile);

router.get('/profile/verify-otp',profileControllers.getVerifyOtp);
router.post('/profile/verify-otp',profileControllers.postVerifyOtp);

router.get('/profile/change-password', userAuth, profileControllers.getChangePassword);
router.post('/profile/change-password', userAuth, profileControllers.postChangePassword);


module.exports = router;