const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

const getCartPage = async(req, res, next) => {
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

  } catch (err) {
    next(err)
  }
};

const addToCart = async (req, res, next) => {
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
     next(err);
    }
};
    
const updateCartQuantity = async (req, res, next) => {
    try {
        const userId = req.session.user._id;
        const productId = req.params.productId;
        const { action } = req.body;

        // Validate product
        const product = await Product.findById(productId);
        if (!product || product.status !== 'Available' || product.quantity < 1) {
            return res.status(400).json({ 
                success: false, 
                message: 'Product not available or out of stock' 
            });
        }

        // Find user and cart item
        const user = await User.findById(userId);
        const item = user.cart.find(item => item.product.toString() === productId);
        
        if (!item) {
            return res.status(404).json({ 
                success: false, 
                message: 'Item not found in cart' 
            });
        }

        // Update quantity based on action
        if (action === 'increase') {
            if (item.quantity < product.quantity) {
                item.quantity += 1;
            } else {
                return res.json({ 
                    success: false, 
                    limitReached: true,
                    message: 'Cannot add more items than available in stock',
                    maxQuantity: product.quantity
                });
            }
        } else if (action === 'decrease') {
            if (item.quantity > 1) {
                item.quantity -= 1;
            } else {
                return res.json({ 
                    success: false, 
                    message: 'Minimum quantity is 1. Use remove button to delete item.' 
                });
            }
        } else {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid action. Use "increase" or "decrease"' 
            });
        }

        await user.save();
        
        res.json({ 
            success: true, 
            newQuantity: item.quantity,
            message: 'Cart updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error while updating cart' 
        });
    }
};

const removeFromCart = async (req, res, next) => {
    try {
        const userId = req.session.user._id;
        const productId = req.params.productId;

        // Verify item exists in cart before removal
        const user = await User.findById(userId);
        const itemExists = user.cart.some(item => item.product.toString() === productId);
        
        if (!itemExists) {
            return res.status(404).json({ 
                success: false, 
                message: 'Item not found in cart' 
            });
        }

        // Remove item from cart
        await User.findByIdAndUpdate(userId, {
            $pull: { cart: { product: productId } }
        });

        res.json({ 
            success: true,
            message: 'Item removed from cart successfully'
        });
        
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error while removing item from cart' 
        });
    }
};
  
const getItemsInCartCount = async (req, res, next) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(200).json({ success: true, value: 0 });
    }

    const userId = req.session.user._id;
    if (!userId) {
      return res.status(404).json({ success: false, value: 0 });
    }

    const userCart = await User.findById(userId).select('cart -_id');
    const value = userCart?.cart?.length || 0;

    return res.status(200).json({ success: true, value });
  } catch (error) {
    next(error)
  }
};


module.exports ={
    getCartPage,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    getItemsInCartCount,
}