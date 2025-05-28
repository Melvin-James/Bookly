const express = require('express');
const router = express.Router();
const adminControllers = require('../controllers/admin/adminControllers');
const customerControllers = require('../controllers/admin/customerControllers');
const categoryControllers = require('../controllers/admin/categoryControllers');
const productControllers = require('../controllers/admin/productControllers');
const orderControllers = require('../controllers/admin/orderControllers');
const inventoryControllers = require('../controllers/admin/inventoryControllers');
const couponControllers = require('../controllers/admin/couponControllers');
const offerControllers = require('../controllers/admin/offerControllers');
const salesReportControllers = require('../controllers/admin/salesReportControllers');
const {userAuth,adminAuth}=require('../middlewares/auth');
const uploadTo = require('../middlewares/multer');
const uploadProductImage = uploadTo('product-images');

router.get('/pageerror',adminControllers.pageerror);
router.get('/login',adminControllers.loadLogin);
router.post('/login',adminControllers.login);
router.get('/logout',adminControllers.logout);

router.get('/dashboard',adminAuth,adminControllers.loadDashboard);
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


router.get('/orders',adminAuth,orderControllers.getAdminOrders);
router.get('/orders/:id', adminAuth, orderControllers.getAdminOrderDetails);
router.post('/orders/:orderId/status', adminAuth, orderControllers.updateOrderStatus);
router.post('/orders/:id/approve-return', adminAuth, orderControllers.approveReturnRequest);
router.post('/orders/:id/reject-return', adminAuth, orderControllers.rejectReturnRequest);

router.get('/inventory', adminAuth, inventoryControllers.getInventoryPage);
router.get('/search-stock', adminAuth, inventoryControllers.searchStock);
router.get('/stock-pagination', adminAuth, inventoryControllers.getPaginatedStock);
router.post('/inventory/update-stock/:productId', adminAuth, inventoryControllers.updateStock);
router.post('/inventory/update-status/:productId', adminAuth, inventoryControllers.updateProductStatus);

router.get('/coupons',adminAuth,couponControllers.getCouponPage);
router.post('/coupons/create',adminAuth,couponControllers.createCoupon);
router.post('/coupons/delete/:id',adminAuth,couponControllers.deleteCoupon);


router.get('/offers', adminAuth, offerControllers.getOfferPage);
router.post('/offers/product', adminAuth, offerControllers.applyProductOffer);
router.post('/offers/product/:productId', adminAuth, offerControllers.applyProductOffer);
router.post('/offers/product/delete/:productId', adminAuth, offerControllers.removeProductOffer);
router.post('/offers/category', adminAuth, offerControllers.applyCategoryOffer);
router.post('/offers/category/delete/:categoryId', adminAuth, offerControllers.removeCategoryOffer);


router.get('/sales-report',adminAuth,salesReportControllers.getSalesReport);
router.get('/sales-report/download/pdf',salesReportControllers.downloadSalesReportPDF);
router.get('/sales-report/download/excel',salesReportControllers.downloadSalesReportExcel);
module.exports=router;