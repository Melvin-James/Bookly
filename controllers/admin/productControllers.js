const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const fs = require('fs');
const path = require('path');

const productInfo = async (req, res,next) => {
    try{
        const products = await Product.find().sort({createdAt:-1}).populate('category');
        res.render('layout', {body:'products',products});

    } catch (error) {
       next(err);
    }
};

const toggleBlockStatusProduct = async (req, res,next) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false });
  
      product.isBlocked = !product.isBlocked;
      await product.save();
  
      res.json({ success: true, isBlocked: product.isBlocked });
    } catch (err) {
      next(err);
    }
};

const searchProducts = async(req,res,next)=>{
    try{
      const query = req.query.query || '';
      const products = await Product.find({
          name:{$regex:query, $options:'i'}
      }).sort({createdAt:-1}).populate('category');
      res.json({products});
    }catch(error){
      next(err);
    }
};

const getPaginatedProducts = async (req, res,next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 4;
      const skip = (page - 1) * limit;
      const query = req.query.query || '';
  
      const products = await Product.find({
            name: { $regex: query, $options: 'i' }
      }).sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category');
  
      const totalProducts = await Product.countDocuments({
            name: { $regex: query, $options: 'i' }
      });
  
      const totalPages = Math.ceil(totalProducts / limit);
  
      res.json({ products, totalPages, currentPage: page });
    } catch (error) {
      next(err);
    }
  };

const getAddProduct = async (req, res,next) => {
  try {
    const categories = await Category.find({ isListed: true });
    res.render('product-add', { categories });
  } catch (err) {
    next(err);
  }
};

const addProduct = async (req, res,next) => {
  try {
    const {
      name, description, publisher, category,
      price, productOffer, quantity, color, status,
    } = req.body;

    let errors = {};

    if (!name) errors.name = 'Product name is required';
    if (!description) errors.description = 'Description is required';
    if (!publisher) errors.publisher = 'Publisher is required';
    if (!category) errors.category = 'Category is required';
    if (!price) errors.price = 'Price is required';
    if (!productOffer) errors.productOffer = 'Product offer is required';
    if (!quantity) errors.quantity = 'Quantity is required';
    if (!color) errors.color = 'Color is required';
    if (!status) errors.status = 'Status is required';

    if (!req.files || req.files.length !== 3) {
      errors.productImage = 'Exactly 3 product images are required';
    }

    const existingProduct = await Product.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existingProduct) {
      errors.name = "Product is already added";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const productImages = req.files.map(file => file.path);

    const newProduct = new Product({
      name,
      description,
      publisher,
      category,
      price,
      productOffer,
      quantity,
      color,
      status,
      productImage: productImages
    });

    await newProduct.save();
    return res.json({ success: true, redirectTo: "/admin/products" });

  } catch (err) {
    next(err);
  }
};
  
const getEditProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    const categories = await Category.find({ isListed: true });
    
    if (!product) {
      return res.status(404).render('admin/error', {
        title: 'Product Not Found',
        message: 'The requested product could not be found.'
      });
    }
    
    res.render('product-edit', {
      title: 'Edit Product',
      product,
      categories
    });
  } catch (err) {
    console.error('Error fetching product for edit:', err);
    next(err);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const {
      name,
      description,
      publisher,
      category,
      price,
      productOffer,
      quantity,
      color,
      status,
      existingImages
    } = req.body;

    const errors = {};

    if (!name || name.trim().length < 2) {
      errors.name = 'Product name must be at least 2 characters';
    }
    if (!description || description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }
    if (!publisher || publisher.trim().length < 2) {
      errors.publisher = 'Publisher name must be at least 2 characters';
    }
    if (!category) {
      errors.category = 'Please select a category';
    }
    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      errors.price = 'Please enter a valid price';
    }
    if (productOffer && (isNaN(productOffer) || parseFloat(productOffer) < 0 || parseFloat(productOffer) > 100)) {
      errors.productOffer = 'Product offer must be between 0 and 100';
    }
    if (!quantity || isNaN(quantity) || parseInt(quantity) < 0) {
      errors.quantity = 'Please enter a valid quantity';
    }
    if (!color || color.trim().length < 2) {
      errors.color = 'Color must be at least 2 characters';
    }
    if (!status) {
      errors.status = 'Please select a status';
    }

    let finalImages = [];
    if (existingImages) {
      try {
        const parsedExistingImages = JSON.parse(existingImages);
        if (Array.isArray(parsedExistingImages)) {
          finalImages = parsedExistingImages;
        }
      } catch (e) {
        console.error('Error parsing existing images:', e);
      }
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path);
      finalImages = [...finalImages, ...newImages];
    }

    if (finalImages.length !== 3) {
      errors.productImage = 'Exactly 3 product images are required';
    }

    if (Object.keys(errors).length > 0) {      
      return res.status(400).json({
        success: false,
        errors: errors
      });
    }

    const currentProduct = await Product.findById(productId);
    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const imagesToDelete = currentProduct.productImage.filter(img => !finalImages.includes(img));

    imagesToDelete.forEach(imageName => {
      const imagePath = path.join(__dirname, '../public/uploads/product-images', imageName);
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error('Error deleting image:', err);
        }
      });
    });

    const updatedProduct = {
      name: name.trim(),
      description: description.trim(),
      publisher: publisher.trim(),
      category,
      price: parseFloat(price),
      productOffer: productOffer ? parseFloat(productOffer) : 0,
      quantity: parseInt(quantity),
      color: color.trim(),
      status,
      productImage: finalImages
    };

    // Update the product
    await Product.findByIdAndUpdate(productId, updatedProduct, { new: true });

    res.json({
      success: true,
      message: 'Product updated successfully',
      redirectTo: '/admin/products'
    });

  } catch (err) {
    console.error('Error updating product:', err);
    
    // Clean up uploaded files if there's an error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, '../public/uploads/product-images', file.filename);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error cleaning up uploaded file:', unlinkErr);
          }
        });
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while updating product'
    });
  }
};

module.exports={
    productInfo,
    toggleBlockStatusProduct,
    searchProducts,
    getPaginatedProducts,
    getAddProduct,
    addProduct,
    getEditProduct,
    updateProduct,
}
