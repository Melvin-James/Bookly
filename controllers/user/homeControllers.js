const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Customers = require('../../models/userSchema');

const getShopProducts = async function(req, res,next) {
  try {
    const user = await Customers.findById(req.session.user._id);
    const { search, sort, category, priceRange, page = 1 } = req.query;
    const limit = 12; 
    const skip = (page - 1) * limit;
    
    let query = { isBlocked: false };
    let searchConditions = [];
    let filterConditions = [];
    
    if (search) {
      searchConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { publisher: { $regex: search, $options: 'i' } }
        ]
      });
    }
    
    if (category) {
      let categoryNames = [];
      
      if (Array.isArray(category)) {
        categoryNames = category;
      } else if (typeof category === 'string') {
        categoryNames = category.includes(',') ? category.split(',').map(name => name.trim()) : [category.trim()];
      }
      
      if (categoryNames.length > 0) {
        const categories = await Category.find({ 
          name: { $in: categoryNames.map(name => new RegExp(`^${name}$`, 'i')) },
          isListed: true 
        });
        
        if (categories.length > 0) {
          const categoryIds = categories.map(cat => cat._id);
          filterConditions.push({ category: { $in: categoryIds } });
        }
      }
    }
    
    if (priceRange) {
      let priceFilters = [];

      if (Array.isArray(priceRange)) {
        priceFilters = priceRange;
      } else if (typeof priceRange === 'string') {
        priceFilters = priceRange.includes(',') ? priceRange.split(',').map(filter => filter.trim()) : [priceRange.trim()];
      }
      
      const priceConditions = [];
      
      for (const filter of priceFilters) {
        switch (filter) {
          case 'under300':
            priceConditions.push({ discountedPrice: { $lt: 300 } });
            break;
          case '300-400':
            priceConditions.push({ discountedPrice: { $gte: 300, $lte: 400 } });
            break;
          case '400-500':
            priceConditions.push({ discountedPrice: { $gte: 400, $lte: 500 } });
            break;
          case 'over500':
            priceConditions.push({ discountedPrice: { $gt: 500 } });
            break;
        }
      }
      
      if (priceConditions.length > 0) {
        filterConditions.push({ $or: priceConditions });
      }
    }
    
    const allConditions = [...searchConditions, ...filterConditions];
    
    if (allConditions.length > 0) {
      query.$and = allConditions;
    }
    
    let sortOption = {};
    if (sort) {
      switch (sort) {
        case 'price-low':
          sortOption = { discountedPrice: 1 };
          break;
        case 'price-high':
          sortOption = { discountedPrice: -1 };
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
    
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate('category', 'name');
    
    const totalProducts = await Product.countDocuments(query);
    
    const categories = await Category.find({ isListed: true });
    
    res.render('shopPage', {
      products,
      userData: user,
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
          if (newParams[key] === undefined || newParams[key] === null || newParams[key] === '') {
            delete params[key];
          } else {
            params[key] = newParams[key];
          }
        });
        
        const queryString = Object.entries(params)
          .filter(([_, value]) => value !== undefined && value !== null && value !== '')
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
        
        return `/user/shop${queryString ? '?' + queryString : ''}`;
      }
    });
    
  } catch (err) {
    next(err);
  }
}

const getProductDetails = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) {
      return res.status(404).render('404');
    }

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      isBlocked: false,
      category: product.category._id,
      status: 'Available'
    }).limit(4);

    let user = null;

    if (req.session?.user?._id) {
      const userId = req.session.user._id;
      user = await Customers.findById(userId).populate('wishlist');
    }

    res.render('product-details', {
      product,
      relatedProducts,
      userData: user, 
    });

  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).render('error', { message: 'Server error' });
  }
};


const account = async(req,res,next)=>{
  try{
    const {email} = req.body;
    const customer = await Customers.find({email});
    res.render('account',{customer})
  }catch(err){
    next(err)
  }
}

module.exports={
    getProductDetails,
    getShopProducts,
    account,
}