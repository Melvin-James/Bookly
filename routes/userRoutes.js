const express = require('express');
const passport = require('passport');
const router = express.Router();

const userControllers=require('../controllers/user/userControllers');
const homeControllers = require('../controllers/user/homeControllers');
const profileControllers = require('../controllers/user/profileControllers');
const cartControllers = require('../controllers/user/cartControllers');
const checkOutControllers = require('../controllers/user/checkOutControllers');
const wishlistControllers = require('../controllers/user/wishlistControllers');
const couponControllers = require('../controllers/user/couponControllers');
const walletControllers = require('../controllers/user/walletControllers');
const {userAuth,adminAuth}=require('../middlewares/auth');
const uploadTo=require('../middlewares/multer')
const uploadProfileImage = uploadTo('profileImages');

router.get('/signup',userControllers.loadSignup);
router.post('/signup',userControllers.signupStep1);
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/user/login' }),
  (req, res) => {
    req.session.user = req.user; 
    res.redirect('/user/home');
  }
);
router.post('/verify-otp', userControllers.verifyOtp);
router.post('/resendOtp',userControllers.resendOtp);

router.get('/home', userControllers.homePage);
router.get('/', userControllers.homePage);      


router.get('/login',userControllers.loadLogin);
router.post('/login',userControllers.login);

router.get('/forgot-password',userControllers.loadForgotPassword);
router.post('/forgot-password',userControllers.forgotPassword);

router.get('/reset-password',userControllers.loadResetPassword);
router.post('/reset-password',userControllers.resetPassword);

router.get('/logout',userAuth,userControllers.logout);

router.get('/shop',userAuth,homeControllers.getShopProducts);
router.get('/product-details/:id',homeControllers.getProductDetails);

router.get('/profile',userAuth,profileControllers.getProfilePage);
router.get('/profile/edit',userAuth,profileControllers.getEditProfile);
router.post('/profile/edit',userAuth,uploadProfileImage.single('userImage'),profileControllers.postEditProfile);

router.get('/profile/verify-otp',profileControllers.getVerifyOtp);
router.post('/profile/verify-otp',profileControllers.postVerifyOtp);

router.get('/profile/change-password', userAuth, profileControllers.getChangePassword);
router.post('/profile/change-password', userAuth, profileControllers.postChangePassword);

router.get('/profile/addresses',userAuth,profileControllers.getAllAddresses);
router.get('/profile/addresses/add',userAuth,profileControllers.getAddAddressPage);
router.post('/profile/addresses/add',userAuth,profileControllers.postAddAddress);

router.get('/profile/addresses/edit/:addressId',userAuth,profileControllers.getEditAddressPage);
router.post('/profile/addresses/edit/:addressId',userAuth,profileControllers.postEditAddress);
router.post('/profile/addresses/delete/:addressId',userAuth,profileControllers.deleteAddress);
router.get('/profile/orders',userAuth,profileControllers.getOrdersPage);
router.get('/profile/orders/:id',userAuth,profileControllers.getOrderDetails);
router.post('/profile/orders/:id/cancel',userAuth,profileControllers.cancelOrder);
router.post('/profile/orders/return-item/:orderId/:productId', userAuth, profileControllers.returnOrderItem);
router.post('/profile/orders/cancel-item/:orderId/:productId', userAuth, profileControllers.cancelOrderItem);
router.get('/profile/orders/:id/invoice',userAuth,profileControllers.downloadInvoice);

router.get('/cart',userAuth,cartControllers.getCartPage);
router.post('/cart/add/:productId',userAuth,cartControllers.addToCart);
router.post('/cart/update/:productId',userAuth,cartControllers.updateCartQuantity);
router.post('/cart/remove/:productId',userAuth,cartControllers.removeFromCart);
router.get('/itemsInCartcount',cartControllers.getItemsInCartCount);

router.get('/checkout',userAuth,checkOutControllers.getCheckoutPage);
router.get('/checkout/addAddress',userAuth,checkOutControllers.getaddAddress);
router.post('/checkout/addAddress',userAuth,checkOutControllers.postaddAddress);
router.post('/place-order',userAuth,checkOutControllers.placeOrder);
router.post('/create-order', userAuth, checkOutControllers.createRazorpayOrder);
router.get('/order-success',userAuth,checkOutControllers.getOrderSuccessPage);
router.get('/order-failure', userAuth, checkOutControllers.getOrderFailurePage);

router.get('/wishlist',userAuth,wishlistControllers.getWishlistPage);
router.post('/wishlist/:productId',userAuth,wishlistControllers.toggleWishlist);
router.post('/wishlist/move-to-cart/:productId', wishlistControllers.moveToCart);
router.get('/itemsInWishlistCount',wishlistControllers.getItemsInWishlistCount);


router.post('/apply-coupon',userAuth,couponControllers.applyCoupon);
router.post('/remove-coupon',userAuth,couponControllers.removeCoupon);

router.get('/wallet', userAuth, walletControllers.getWalletPage);
router.get('/wallet/transactions', userAuth, walletControllers.getWalletTransactions);


module.exports = router;