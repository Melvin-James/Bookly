const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');

const getOfferPage = async (req, res) => {
  try {
    const [products, categories] = await Promise.all([
      Product.find().sort({ name: 1 }).lean(),
      Category.find().sort({ name: 1 }).lean()
    ]);
    
    res.render('layout', {
      body: 'adminOffers',
      admin: req.session.admin,
      products,
      categories,
    });
  } catch (err) {
    console.error('Error loading offer page:', err);
    res.status(500).render('error', { message: 'Failed to load offer management page' });
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
    console.error('Error applying product offer:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to apply product offer'
    });
  }
};

const applyCategoryOffer = async (req, res) => {
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
    console.error('Error applying category offer:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to apply category offer'
    });
  }
};

const removeProductOffer = async (req, res) => {
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
    console.error('Error removing product offer:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to remove product offer'
    });
  }
};

const removeCategoryOffer = async (req, res) => {
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
    console.error('Error removing category offer:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to remove category offer'
    });
  }
};

module.exports = {
  getOfferPage,
  applyProductOffer,
  applyCategoryOffer,
  removeProductOffer,
  removeCategoryOffer,
};