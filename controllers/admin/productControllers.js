const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');

const productInfo = async (req, res) => {
    try{
        const products = await Product.find().sort({createdAt:-1}).populate('category');
        res.render('layout', {body:'products',products});

    } catch (error) {
        console.error("Error in productInfo:", error);
        res.status(500).render('pageerror', { message: "Failed to load product data" });
    }
};

const toggleBlockStatusProduct = async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false });
  
      product.isBlocked = !product.isBlocked;
      await product.save();
  
      res.json({ success: true, isBlocked: product.isBlocked });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
};

const searchProducts = async(req,res)=>{
    try{
      const query = req.query.query || '';
      const products = await Product.find({
          name:{$regex:query, $options:'i'}
      }).sort({createdAt:-1}).populate('category');
      res.json({products});
    }catch(error){
      console.error('Search error:',error);
      res.status(500).json({error:'Internal server Error'});

    }
};

const getPaginatedProducts = async (req, res) => {
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
      console.error('Pagination error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

const getAddProduct = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true });
    res.render('product-add', { categories });
  } catch (err) {
    console.error('Error loading add product page:', err);
    res.status(500).send('Server Error');
  }
};

const addProduct = async (req, res) => {
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

    const productImages = req.files.map(file => file.filename);

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
    console.error("Error saving product:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
  
const getEditProduct = async(req,res)=>{
  try{
    const product = await Product.findById(req.params.id);
    const categories = await Category.find({isListed:true});
    if(!product) return res.status(404).send('product not found');
    res.render('product-edit',{product,categories});
  }catch(error){
    console.error('Error loading edit product page:',error);
    res.status(500).send('Server Error');
  }
};

const updateProduct = async(req,res)=>{
  try{
    const updatedProduct = {
      name:req.body.name,
      description:req.body.description,
      publisher:req.body.publisher,
      category:req.body.category,
      price:req.body.price,
      productOffer:req.body.productOffer,
      quantity:req.body.quantity,
      color:req.body.color,
      status:req.body.status,
    };

    if(req.files?.length>0){
      updatedProduct.productImage = req.files.map(file=>file.filename);
    }

    // if (req.files.length !== 3) {
    //   return res.status(400).json({ errors: { productImage: 'Exactly 3 images required.' } });
    // }
    

    await Product.findByIdAndUpdate(req.params.id,updatedProduct);
    res.json({success:true, redirectTo:'/admin/products'});
  }catch(error){
    console.error('Error updating product:',error);
    res.status(500).send('Server Error');
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
