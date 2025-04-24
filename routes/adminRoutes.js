const express = require('express');
const router = express.Router();
const adminControllers = require('../controllers/admin/adminControllers');
const customerControllers = require('../controllers/admin/customerControllers');
const categoryControllers = require('../controllers/admin/categoryControllers');
const productControllers = require('../controllers/admin/productControllers');
const {userAuth,adminAuth}=require('../middlewares/auth');
const uploadTo = require('../middlewares/multer');
const uploadProductImage = uploadTo('product-images');

router.get('/pageerror',adminControllers.pageerror);
router.get('/login',adminControllers.loadLogin);
router.post('/login',adminControllers.login);
router.get('/dashboard',adminAuth,adminControllers.loadDashboard);
router.get('/logout',adminControllers.logout);

router.get('/users',adminAuth,customerControllers.customerInfo);
router.patch('/customer/:id',adminAuth,customerControllers.toggleBlockStatusCustomer);
router.get('/search-customer',adminAuth,customerControllers.searchCustomers);
router.get('/customer-pagination',adminAuth,customerControllers.getPaginatedUsers);

router.get('/category',adminAuth,categoryControllers.categoryInfo);
router.patch('/categories/:id',adminAuth,categoryControllers.toggleBlockStatusCategory);
router.get('/search-category',adminAuth,categoryControllers.searchCategory);
router.get('/category-pagination',adminAuth,categoryControllers.getPaginatedCategory);
router.get('/category-edit/:id', adminAuth,categoryControllers.getEditCategory);
router.post('/category-edit/:id', adminAuth,categoryControllers.updateCategory);
router.get('/category-add',adminAuth,categoryControllers.getAddCategory);
router.post('/category-add',adminAuth,categoryControllers.addCategory);

router.get('/products',adminAuth,productControllers.productInfo);
router.patch('/product/:id',adminAuth,productControllers.toggleBlockStatusProduct);
router.get('/search-product',adminAuth,productControllers.searchProducts);
router.get('/product-pagination',adminAuth,productControllers.getPaginatedProducts);
router.get('/product-add',adminAuth,productControllers.getAddProduct);
router.post('/product-add',adminAuth,uploadProductImage.array('productImage', 3),productControllers.addProduct);
router.get('/product-edit/:id',adminAuth,productControllers.getEditProduct);
router.patch('/product-edit/:id',adminAuth,uploadProductImage.array('productImage',3),productControllers.updateProduct);

module.exports=router;