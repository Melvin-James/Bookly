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

const getAddProduct = async (req, res, next) => {
  try {
    const categories = await Category.find({ isListed: true })
    res.render('product-add', { categories })
  } catch (err) {
    next(err)
  }
}

const addProduct = async (req, res, next) => {
  try {
    const {
      name, description, publisher, category,
      price, productOffer, quantity, color, status,
    } = req.body

    let errors = {}

    if (!name?.trim()) {
      errors.name = 'Product name is required'
    } else {
      const trimmedName = name.trim()
      if (trimmedName.length < 2) {
        errors.name = 'Product name must be at least 2 characters long'
      } else if (trimmedName.length > 100) {
        errors.name = 'Product name cannot exceed 100 characters'
      } else if (!/^[a-zA-Z0-9\s\-_.,()&]+$/.test(trimmedName)) {
        errors.name = 'Product name contains invalid characters'
      } else {
        const existingProduct = await Product.findOne({ 
          name: { $regex: `^${trimmedName}$`, $options: 'i' } 
        })
        if (existingProduct) {
          errors.name = 'A product with this name already exists'
        }
      }
    }

    if (!description?.trim()) {
      errors.description = 'Product description is required'
    } else {
      const trimmedDescription = description.trim()
      if (trimmedDescription.length < 10) {
        errors.description = 'Description must be at least 10 characters long'
      } else if (trimmedDescription.length > 2000) {
        errors.description = 'Description cannot exceed 2000 characters'
      }
    }

    if (!publisher?.trim()) {
      errors.publisher = 'Publisher name is required'
    } else {
      const trimmedPublisher = publisher.trim()
      if (trimmedPublisher.length < 2) {
        errors.publisher = 'Publisher name must be at least 2 characters long'
      } else if (trimmedPublisher.length > 50) {
        errors.publisher = 'Publisher name cannot exceed 50 characters'
      } else if (!/^[a-zA-Z0-9\s\-_.,()&]+$/.test(trimmedPublisher)) {
        errors.publisher = 'Publisher name contains invalid characters'
      }
    }

    if (!category) {
      errors.category = 'Please select a category'
    } else {
      const categoryExists = await Category.findOne({ _id: category, isListed: true })
      if (!categoryExists) {
        errors.category = 'Selected category is invalid or not available'
      }
    }

    if (!price) {
      errors.price = 'Product price is required'
    } else {
      const numPrice = Number.parseFloat(price)
      if (isNaN(numPrice) || numPrice <= 0) {
        errors.price = 'Price must be greater than 0'
      } else if (numPrice < 1) {
        errors.price = 'Price must be at least ₹1'
      } else if (numPrice > 100000) {
        errors.price = 'Price cannot exceed ₹1,00,000'
      } else if (!/^\d+(\.\d{1,2})?$/.test(price.toString())) {
        errors.price = 'Price can have maximum 2 decimal places'
      }
    }

    if (productOffer === undefined || productOffer === '') {
      errors.productOffer = 'Product offer percentage is required'
    } else {
      const numOffer = Number.parseFloat(productOffer)
      if (isNaN(numOffer) || numOffer < 0) {
        errors.productOffer = 'Offer percentage cannot be negative'
      } else if (numOffer > 90) {
        errors.productOffer = 'Offer percentage cannot exceed 90%'
      } else if (!/^\d+(\.\d{1,2})?$/.test(productOffer.toString())) {
        errors.productOffer = 'Offer percentage can have maximum 2 decimal places'
      }
    }

    if (!quantity) {
      errors.quantity = 'Product quantity is required'
    } else {
      const numQuantity = Number.parseInt(quantity)
      if (isNaN(numQuantity) || numQuantity < 0) {
        errors.quantity = 'Quantity cannot be negative'
      } else if (numQuantity > 10000) {
        errors.quantity = 'Quantity cannot exceed 10,000'
      } else if (!Number.isInteger(Number.parseFloat(quantity))) {
        errors.quantity = 'Quantity must be a whole number'
      }
    }

    if (!color?.trim()) {
      errors.color = 'Product color is required'
    } else {
      const trimmedColor = color.trim()
      if (trimmedColor.length < 2) {
        errors.color = 'Color must be at least 2 characters long'
      } else if (trimmedColor.length > 30) {
        errors.color = 'Color name cannot exceed 30 characters'
      } else if (!/^[a-zA-Z\s\-]+$/.test(trimmedColor)) {
        errors.color = 'Color name can only contain letters, spaces, and hyphens'
      }
    }

    const validStatuses = ['Available', 'Out of Stock', 'Discontinued']
    if (!status) {
      errors.status = 'Please select a product status'
    } else if (!validStatuses.includes(status)) {
      errors.status = 'Please select a valid status'
    }

    if (!req.files || req.files.length === 0) {
      errors.productImage = 'Product images are required'
    } else if (req.files.length !== 3) {
      errors.productImage = 'Exactly 3 product images are required'
    } else {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      const maxSize = 5 * 1024 * 1024 
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        if (!allowedTypes.includes(file.mimetype)) {
          errors.productImage = 'Only JPEG, PNG, and WebP images are allowed'
          break
        }
        if (file.size > maxSize) {
          errors.productImage = 'Each image must be less than 5MB'
          break
        }
      }
    }

    if (price && productOffer) {
      const numPrice = Number.parseFloat(price)
      const numOffer = Number.parseFloat(productOffer)
      if (!isNaN(numPrice) && !isNaN(numOffer)) {
        const discountedPrice = numPrice - (numPrice * numOffer / 100)
        if (discountedPrice < 1) {
          errors.productOffer = 'Offer percentage is too high for this price'
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors })
    }

    const productImages = req.files.map(file => file.path)

    const newProduct = new Product({
      name: name.trim(),
      description: description.trim(),
      publisher: publisher.trim(),
      category,
      price: Number.parseFloat(price),
      productOffer: Number.parseFloat(productOffer),
      quantity: Number.parseInt(quantity),
      color: color.trim(),
      status,
      productImage: productImages,
      createdAt: new Date(),
    })

    await newProduct.save()

    return res.json({ 
      success: true, 
      message: 'Product added successfully',
      redirectTo: "/admin/products" 
    })

  } catch (err) {
    console.error('Error adding product:', err)
    if (err.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        errors: { name: 'A product with this name already exists' }
      })
    }
    next(err)
  }
}

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

    await Product.findByIdAndUpdate(productId, updatedProduct, { new: true });

    res.json({
      success: true,
      message: 'Product updated successfully',
      redirectTo: '/admin/products'
    });

  } catch (err) {
    console.error('Error updating product:', err);
    
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
