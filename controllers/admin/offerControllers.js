const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const STATUS = require('../../config/statusCodes');
const {OFFER}=require('../../config/messages');

const getOfferPage = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const productSearch = req.query.productSearch || '';
    const categorySearch = req.query.categorySearch || '';

    const productQuery = productSearch 
      ? { name: { $regex: productSearch, $options: 'i' } }
      : {};
    
    const categoryQuery = categorySearch 
      ? { name: { $regex: categorySearch, $options: 'i' } }
      : {};

    const [
      products,
      totalProducts,
      categories,
      totalCategories,
      productOffersCount,
      categoryOffersCount
    ] = await Promise.all([
      Product.find(productQuery)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(productQuery),
      Category.find(categoryQuery)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(categoryQuery),
      Product.countDocuments({ productOffer: { $gt: 0 } }),
      Category.countDocuments({ categoryOffer: { $gt: 0 } })
    ]);

    const totalPages = Math.ceil(Math.max(totalProducts, totalCategories) / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const [allProducts, allCategories] = await Promise.all([
      Product.find().sort({ name: 1 }).lean(),
      Category.find().sort({ name: 1 }).lean()
    ]);

    res.render('layout', {
      body: 'adminOffers',
      admin: req.session.admin,
      products,
      categories,
      allProducts, 
      allCategories,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        totalCategories,
        limit,
        hasNextPage,
        hasPrevPage,
        productSearch,
        categorySearch
      },
      stats: {
        productOffersCount,
        categoryOffersCount
      }
    });
  } catch (err) {
    console.error('Error in getOfferPage:', err);
    next(err);
  }
};

const validateOfferInput = (offer) => {
  const offerValue = parseFloat(offer);
  if (isNaN(offerValue)) {
    throw new Error('Offer must be a valid number');
  }
  if (offerValue < 0 || offerValue > 100) {
    throw new Error('Offer must be between 0 and 100');
  }
  return offerValue;
};

const applyProductOffer = async (req, res) => {
  try {
    const { productId, offer } = req.body;
    
    if (!productId) throw new Error('Product selection is required');
    const offerPercentage = validateOfferInput(offer);

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { productOffer: offerPercentage },
      { new: true }
    );

    if (!updatedProduct) throw new Error('Product not found');

    res.json({ 
      success: true,
      message: 'Product offer applied successfully',
      product: updatedProduct
    });
  } catch (err) {
    next(err);
  }
};

const applyCategoryOffer = async (req, res,next) => {
  try {
    const { categoryId, offer } = req.body;
    
    if (!categoryId) throw new Error('Category selection is required');
    const offerPercentage = validateOfferInput(offer);

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { categoryOffer: offerPercentage },
      { new: true }
    );

    if (!updatedCategory) throw new Error('Category not found');

    res.json({ 
      success: true,
      message: 'Category offer applied successfully',
      category: updatedCategory
    });
  } catch (err) {
    next(err);
  }
};

const removeProductOffer = async (req, res,next) => {
  try {
    const { productId } = req.params;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { productOffer: 0 },
      { new: true }
    );

    if (!updatedProduct) throw new Error('Product not found');

    res.json({
      success: true,
      message: 'Product offer removed successfully',
      productId: updatedProduct._id
    });
  } catch (err) {
    next(err);
  }
};

const removeCategoryOffer = async (req, res,next) => {
  try {
    const { categoryId } = req.params;

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { categoryOffer: 0 },
      { new: true }
    );

    if (!updatedCategory) throw new Error('Category not found');

    res.json({
      success: true,
      message: 'Category offer removed successfully',
      categoryId: updatedCategory._id
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOfferPage,
  applyProductOffer,
  applyCategoryOffer,
  removeProductOffer,
  removeCategoryOffer,
};