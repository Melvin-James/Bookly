const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

const getCartPage = async(req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).populate('cart.product');

    const cartItems = user.cart;

    let cartTotalOriginal = 0;
    let cartTotalDiscounted = 0;

    cartItems.forEach(item => {
      const quantity = item.quantity;
      const originalPrice = item.product.price * quantity;
      const discountedPrice = item.product.discountedPrice * quantity;

      cartTotalOriginal += originalPrice;
      cartTotalDiscounted += discountedPrice;
    });
    const cartSavings = cartTotalOriginal - cartTotalDiscounted;

    res.render('cart', {
      userData: req.session.user,
      cartItems,
      req,
      cartTotalDiscounted,
      cartSavings,
    });

  } catch (error) {
    console.error('Error loading cart:', error);
    res.status(500).render('error', { message: 'Unable to load cart' });
  }
};


const addToCart = async (req, res) => {
    try {
      const userId = req.session.user._id;
      const productId = req.params.productId;
  
      const product = await Product.findById(productId);
      if (!product || product.status !== 'Available' || product.quantity < 1) {
        return res.status(400).json({ success: false, message: 'Product not available' });
      }
  
      const user = await User.findById(userId);
      const itemExists = user.cart.some(item => item.product.toString() === productId);
  
      if (itemExists) {
        return res.json({ success: true, alreadyInCart: true });
      } else {
        user.cart.push({ product: productId, quantity: 1 });
        await user.save();
        return res.json({ success: true, added: true });
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({ success: false, message: 'Failed to add item to cart' });
    }
};
  
  
const updateCartQuantity = async (req, res) => {
    try {
      const userId = req.session.user._id;
      const productId = req.params.productId;
      const { action } = req.body;
  
      const product = await Product.findById(productId);
      if (!product || product.status !== 'Available' || product.quantity < 1) {
        return res.status(400).json({ success: false, message: 'Product not available' });
      }
  
      const user = await User.findById(userId);
      const item = user.cart.find(item => item.product.toString() === productId);
      if (!item) return res.status(404).json({ success: false });
  
      if (action === 'increase') {
        if (item.quantity < 10) {
          item.quantity += 1;
        } else {
          return res.json({ success: false, limitReached: true });
        }
      } else if (action === 'decrease' && item.quantity > 1) {
        item.quantity -= 1;
      }
  
      await user.save();
      res.json({ success: true, newQuantity: item.quantity });
    } catch (error) {
      console.error('Error updating quantity:', error);
      res.status(500).json({ success: false });
    }
  };
  
const removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const productId = req.params.productId;

        await User.findByIdAndUpdate(userId, {
        $pull: { cart: { product: productId } }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ success: false });
    }
};
  

const getItemsInCartCount = async (req,res)=>{
    const userId = req.session.user._id;
    let value =0
    if(!userId)  return res.status(404).json({success:false,value})
    const userCart = await User.findById(userId).select('cart -_id')
    value  = userCart.cart.length
    return res.status(200).json({success:true,value})
}


module.exports ={
    getCartPage,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    getItemsInCartCount,
}