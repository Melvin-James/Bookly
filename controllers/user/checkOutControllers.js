const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Coupon = require('../../models/couponSchema');

const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user._id;


    const addressDoc = await Address.findOne({ userId });
    const addressData = addressDoc ? addressDoc.address : [];

    const user = await User.findById(userId).populate('cart.product');

    if (!user || user.cart.length === 0) {
      return res.redirect('/user/cart');
    }

    let cartItems = [];
    let cartTotal = 0;

    for (let cartItem of user.cart) {
      const product = await Product.findById(cartItem.product);
      if (product) {
        cartItems.push({ product, quantity: cartItem.quantity });
        cartTotal += product.price * cartItem.quantity;
      }
    }
    
    const couponData = req.session.coupon || null;

    res.render('checkout',{
      userData: req.session.user,
      addressData,
      cartItems,
      cartTotal,
      couponData
    });

  } catch (error) {
    console.error('Error loading checkout page:', error);
    res.status(500).render('error', { message: 'Something went wrong at checkout' });
  }
};


const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { addressId } = req.body;

    const addressDoc = await Address.findOne({ userId });
    const selectedAddress = addressDoc?.address.find(addr => addr._id.toString() === addressId);

    if (!selectedAddress) {
      return res.status(400).render('error', { message: 'Invalid address selected!' });
    }

    const user = await User.findById(userId).populate('cart.product');

    if (!user || user.cart.length === 0) {
      return res.redirect('/user/cart');
    }

    let items = [];
    let cartTotal = 0;

    for (let cartItem of user.cart) {
      const product = cartItem.product; 
      if (product) {
        items.push({
          product: product._id,
          quantity: cartItem.quantity,
          status: 'Placed'
        });
        cartTotal += product.price * cartItem.quantity;
      }
    }

    let discountAmount = 0;
    let couponCode = null;
    if (req.session.coupon) {
      discountAmount = req.session.coupon.discountAmount;
      couponCode = req.session.coupon.code;
    }

    const finalAmount = cartTotal - discountAmount;

    const generateOrderId = () => {
      return 'BOOKLY-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    };
    

    const newOrder = new Order({
      orderId: generateOrderId(),
      user: userId,
      items,
      address: selectedAddress,
      paymentMethod: 'COD',
      totalAmount: finalAmount,
      couponApplied: couponCode || null,
      discountAmount: discountAmount || 0,
      status: 'Placed'
    });

    await newOrder.save();

    user.wishlist = user.wishlist.filter(productId => {
      return !items.some(item => item.product.toString() === productId.toString());
    });


    user.cart = [];
    await user.save();

    delete req.session.coupon;

    res.redirect('/user/order-success');

  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).render('error', { message: 'Something went wrong while placing order' });
  }
};



const getOrderSuccessPage = async(req,res)=>{
    try{
        res.render('order-success',{
            userData: req.session.user
        });
    }catch(error){
        console.error('Error loading orderSuccessPage:',error);
        res.status(500).render('error',{message:'Failed to load order success page'});
    }   
}

module.exports={
    getCheckoutPage,
    placeOrder,
    getOrderSuccessPage,
}