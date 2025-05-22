const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Customers = require('../../models/userSchema');
const category = require('../../models/categorySchema');


const getShopProducts = async function(req, res) {
  try {
    const user = await Customers.findById(req.session.user._id);
    const { search, sort, category, priceRange, page = 1 } = req.query;
    const limit = 12; 
    const skip = (page - 1) * limit;
    

    let query = { isBlocked: false };
    

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { publisher: { $regex: search, $options: 'i' } }
      ];
    }
    

    if (category) {
      let categoryCondition;
      
      if (category.includes(',')) {

        const categoryNames = category.split(',');
        const categories = await Category.find({ 
          name: { $in: categoryNames.map(name => new RegExp(`^${name}$`, 'i')) },
          isListed: true 
        });
        const categoryIds = categories.map(cat => cat._id);
        categoryCondition = { $in: categoryIds };
      } else {

        const categoryObj = await Category.findOne({ 
          name: { $regex: new RegExp(`^${category}$`, 'i') },
          isListed: true 
        });
        categoryCondition = categoryObj ? categoryObj._id : null;
      }
      
      if (categoryCondition) {
        query.category = categoryCondition;
      }
    }
    

    if (priceRange) {
      const priceFilters = priceRange.split(',');
      const priceConditions = [];
      
      for (const filter of priceFilters) {
        switch (filter) {
          case 'under300':
            priceConditions.push({ price: { $lt: 300 } });
            break;
          case '300-400':
            priceConditions.push({ price: { $gte: 300, $lte: 400 } });
            break;
          case '400-500':
            priceConditions.push({ price: { $gte: 400, $lte: 500 } });
            break;
          case 'over500':
            priceConditions.push({ price: { $gt: 500 } });
            break;
        }
      }
      
      if (priceConditions.length > 0) {

        if (query.$or) {
          query.$and = [
            { $or: query.$or },
            { $or: priceConditions }
          ];
          delete query.$or;
        } else {
          query.$or = priceConditions;
        }
      }
    }
    
    let sortOption = {};
    if (sort) {
      switch (sort) {
        case 'price-low':
          sortOption = { price: 1 };
          break;
        case 'price-high':
          sortOption = { price: -1 };
          break;
        case 'name-asc':
          sortOption = { name: 1 };
          break;
        case 'name-desc':
          sortOption = { name: -1 };
          break;
        default:
          sortOption = { createdAt: -1 };
      }
    } else {
      sortOption = { createdAt: -1 }; 
    }
    
    // console.log('Combined Query:', JSON.stringify(query, null, 2));
    // console.log('Sort Options:', sortOption);
    
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate('category', 'name');
    

    const totalProducts = await Product.countDocuments(query);
    
    const categories = await Category.find({ isListed: true });
    
    res.render('shopPage', {
      products,
      userData:user,
      categories,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
      filters: {
        search: search || '',
        sort: sort || '',
        category: category || '',
        priceRange: priceRange || ''
      },

      buildQueryUrl: function(newParams) {
        const params = { ...req.query };
        
        Object.keys(newParams).forEach(key => {
          params[key] = newParams[key];
        });
        

        const queryString = Object.entries(params)
          .filter(([_, value]) => value !== undefined && value !== null && value !== '')
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
        
        return `/user/shop${queryString ? '?' + queryString : ''}`;
      }
    });
    
  } catch (error) {
    console.error('Error in shop controller:', error);
    res.status(500).render('error', { 
      message: 'Something went wrong. Please try again later.' 
    });
  }
}

const getProductDetails = async (req, res) => {
  const userId = req.session.user._id;
  const product = await Product.findById(req.params.id).populate('category');
  const relatedProducts = await Product.find({
    _id: { $ne: product._id },
    isBlocked: false,
    category: product.category._id,
    status: 'Available'
  }).limit(4);

  const user = await Customers.findById(userId).populate('wishlist');

  res.render('product-details', 
    { product, 
      relatedProducts, 
      userData:req.session.user,
    });
};

const account = async(req,res)=>{
  try{
    const {email} = req.body;
    const customer = await Customers.find({email});
    res.render('account',{customer})
  }catch(error){
    console.error('Error in shop controller',error);
    res.status(500).render('error',{
      message: 'error loading user details'
    });
  }
}

module.exports={
    getProductDetails,
    getShopProducts,
    account,
}