const Product = require('../../models/productSchema');
const {INVENTORY}=require('../../config/messages');
const STATUS = require('../../config/statusCodes');

const getInventoryPage = async (req, res,next) => {
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
  } catch (err) {
    next(err);
  }
};

const searchStock = async (req, res,next) => {
  try {
    const query = req.query.query;
    const products = await Product.find({
      name: { $regex: query, $options: 'i' }
    }).populate('category');

    res.json({ success: true, products });
  } catch (err) {
    next(err)
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
  } catch (err) {
    next(err);
  }
};

const updateStock = async(req,res,next)=>{
    try {
        const productId = req.params.productId;
        const { quantity, status } = req.body;

        if (isNaN(quantity) || quantity < 0) {
          return res.status(STATUS.BAD_REQUEST).json({
            success: false,
            message: INVENTORY.NEGATIVE_QUANTITY
          });
        }

        await Product.findByIdAndUpdate(productId, {
          quantity,
          status,
        });
        res.json({ success: true });
    }catch(err){
        next(err);
    }
}

const updateProductStatus = async (req, res,next) => {
    try {
      const { productId } = req.params;
      const { status } = req.body;
  
      const validStatuses = ['Available', 'Out of Stock', 'Discontinued'];
      if (!validStatuses.includes(status)) {
        return res.status(STATUS.BAD_REQUEST).json({ success: false, message: INVENTORY.INVALID_STATUS });
      }
  
      await Product.findByIdAndUpdate(productId, { status });
      res.json({ success: true });
    } catch (error) {
      next(err);
    }
};

module.exports = {
    getInventoryPage,
    searchStock,
    getPaginatedStock,
    updateStock,
    updateProductStatus,
}