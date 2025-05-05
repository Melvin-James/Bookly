const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const razorpay = require('../../utils/razorpay');
const Coupon = require('../../models/couponSchema');
const crypto = require('crypto');
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

    const validCoupons = await Coupon.find({
      isActive: true,
      expiresAt: { $gte: new Date() },
      minCartAmount: { $lte: cartTotal }
    });

    res.render('checkout',{
      userData: req.session.user,
      addressData,
      cartItems,
      cartTotal,
      couponData,
      validCoupons,
    });

  } catch (error) {
    console.error('Error loading checkout page:', error);
    res.status(500).render('error', { message: 'Something went wrong at checkout' });
  }
};

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { addressId, paymentMethod, razorpay_payment_id, razorpay_order_id } = req.body;

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
    let cartTotalOriginal = 0;
    let cartTotalDiscounted = 0;

    for (let cartItem of user.cart) {
      const product = cartItem.product;
      if (product) {
        let discountedPrice = product.price * (1 - product.productOffer / 100);
        let totalPrice = discountedPrice * cartItem.quantity;

        items.push({
          product: product._id,
          quantity: cartItem.quantity,
          status: 'Placed',
          originalPrice: product.price, 
          discountedPrice: discountedPrice, 
        });

        cartTotalOriginal += product.price * cartItem.quantity;
        cartTotalDiscounted += totalPrice;
      }
    }

    let couponDiscount = req.session.coupon ? req.session.coupon.discountAmount : 0;
    let couponCode = req.session.coupon ? req.session.coupon.code : null;

    const finalAmount = cartTotalDiscounted - couponDiscount;

    const generateOrderId = () => {
      return 'BOOKLY-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    };

    const newOrder = new Order({
      orderId: generateOrderId(),
      user: userId,
      items,
      address: selectedAddress,
      paymentMethod: paymentMethod === 'Online' ? 'Online' : 'COD',
      paymentStatus: paymentMethod === 'Online' ? 'Paid' : 'Pending',
      razorpayPaymentId: razorpay_payment_id || null,
      razorpayOrderId: razorpay_order_id || null,
      totalAmount: finalAmount,
      couponApplied: couponCode || null,
      couponDiscount: couponDiscount || 0,
      productDiscount: cartTotalOriginal - cartTotalDiscounted,
      status: 'Placed',
    });

    if (couponCode) {
      const currentUsage = user.couponUsage.get(couponCode) || 0;
      user.couponUsage.set(couponCode, currentUsage + 1);
    }

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

const createRazorpayOrder = async(req,res)=>{
  try{
    const userId = req.session.user._id;
    const amount = req.body.amount;

    const options = {
      amount:amount * 100,
      currency:'INR',
      receipt:`receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.json({success:true,order});
  }catch(err){
    console.error('Razorpay order error:',err);
    res.status(500).json({success:false, message:'Failed to create Razorpay order'});
  }
}

const getOrderFailurePage = async (req, res) => {
  try {
    res.render('order-failure', {
      userData: req.session.user
    });
  } catch (error) {
    console.error('Error loading order failure page:', error);
    res.status(500).render('error', { message: 'Failed to load payment failure page.' });
  }
};


module.exports={
    getCheckoutPage,
    placeOrder,
    getOrderSuccessPage,
    createRazorpayOrder,
    getOrderFailurePage,
}