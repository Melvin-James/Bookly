const Product = require('../../models/productSchema');

const getInventoryPage = async (req, res) => {
  try {
    const page = 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const products = await Product.find()
      .populate('category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    res.render('layout', {
      body: 'adminInventory',
      admin: req.session.admin,
      products,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error('Error loading inventory:', error);
    res.status(500).render('error', { message: 'Failed to load inventory' });
  }
};


const searchStock = async (req, res) => {
  try {
    const query = req.query.query;
    const products = await Product.find({
      name: { $regex: query, $options: 'i' }
    }).populate('category');

    res.json({ success: true, products });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: 'Failed to search products' });
  }
};

const getPaginatedStock = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const query = req.query.query || '';

    const filter = query
      ? { name: { $regex: query, $options: 'i' } }
      : {};

    const products = await Product.find(filter)
      .populate('category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    res.json({
      success: true,
      products,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error('Pagination error:', error);
    res.status(500).json({ success: false, message: 'Failed to paginate products' });
  }
};



const updateStock = async(req,res)=>{
    try {
        const productId = req.params.productId;
        const { quantity, status } = req.body;
    
        await Product.findByIdAndUpdate(productId, {
          quantity,
          status,
        });
        res.json({ success: true });
    }catch(error){
        console.error('Stock update error:',error);
        res.status(500).json('error',{message:'Failed to update product stock'});
    }
}

const updateProductStatus = async (req, res) => {
    try {
      const { productId } = req.params;
      const { status } = req.body;
  
      const validStatuses = ['Available', 'Out of Stock', 'Discontinued'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
  
      await Product.findByIdAndUpdate(productId, { status });
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating product status:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

module.exports = {
    getInventoryPage,
    searchStock,
    getPaginatedStock,
    updateStock,
    updateProductStatus,
}