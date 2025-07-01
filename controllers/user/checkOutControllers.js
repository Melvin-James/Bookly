const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const razorpay = require('../../utils/razorpay');
const Coupon = require('../../models/couponSchema');
const crypto = require('crypto');

const getCheckoutPage = async (req, res,next) => {
  try {
    const codLimitError = req.session.codLimitError;
    delete req.session.codLimitError;
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
      const product = cartItem.product;
      if (product) {
        const offer = product.productOffer || 0;
        cartItems.push({ 
          product, 
          quantity: cartItem.quantity,
          discountedPrice:product.discountedPrice,
        });
        cartTotal += product.discountedPrice * cartItem.quantity;
      }
    }

    const couponData = req.session.coupon || null;

    const validCoupons = await Coupon.find({
      isActive: true,
      expiresAt: { $gte: new Date() },
      minCartAmount: { $lte: cartTotal }
    });

    res.render('checkout', {
      userData: req.session.user,
      addressData,
      cartItems,
      cartTotal,
      couponData,
      validCoupons,
      codLimitError,
    });

  } catch (err) {
    next(err);
  }
};

const placeOrder = async (req, res,next) => {
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

    await Address.updateOne(
      { userId },
      { $set: { 'address.$[].isDefault': false } }
    );
    await Address.updateOne(
      { userId, 'address._id': selectedAddress._id },
      { $set: { 'address.$.isDefault': true } }
    );

    let items = [];
    let cartTotalOriginal = 0;
    let cartTotalDiscounted = 0;

    for (let cartItem of user.cart) {
      const product = cartItem.product;
      if (product) {
        let totalPrice = product.discountedPrice * cartItem.quantity;

        items.push({
          product: product._id,
          quantity: cartItem.quantity,
          status: 'Placed',
          originalPrice: product.price,
          discountedPrice: product.discountedPrice,
          productName: product.name,
          productImage: product.image,
        });

        cartTotalOriginal += product.price * cartItem.quantity;
        cartTotalDiscounted += totalPrice;
      }
    }

    const couponDiscount = req.session.coupon?.discountAmount || 0;
    const couponCode = req.session.coupon?.code || null;

    const finalAmount = cartTotalDiscounted - couponDiscount;

    if (
      paymentMethod === 'Online' &&
      (!razorpay_payment_id || !razorpay_order_id || req.body.status === 'Failed')
    ) {
      let failedItems = [];
      for (let cartItem of user.cart) {
        const product = cartItem.product;
        if (product) {
          failedItems.push({
            product: product._id,
            quantity: cartItem.quantity,
            status: 'Failed',
            originalPrice: product.price,
            discountedPrice: product.discountedPrice,
            productName: product.name,
            productImage: Array.isArray(product.productImage) ? product.productImage[0] : product.productImage || 'default.jpg'

          });
        }
      }

      const failedOrder = new Order({
        orderId: 'BOOKLY-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        user: userId,
        items: failedItems,
        address: selectedAddress,
        paymentMethod: 'Online',
        paymentStatus: 'Failed',
        status: 'Failed',
        totalAmount: finalAmount,
        couponApplied: couponCode,
        couponDiscount,
        productDiscount: cartTotalOriginal - cartTotalDiscounted,
        discountAmount: cartTotalOriginal - finalAmount,
      });

      await failedOrder.save();
      return res.redirect('/user/order-failure');
    }


    const generateOrderId = () => {
      return 'BOOKLY-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    };

    if (paymentMethod === 'COD' && finalAmount > 1000) {
      req.session.codLimitError = 'Orders above ₹1000 are not allowed for Cash on Delivery.';
      return res.redirect('/user/checkout');
    }


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
      couponApplied: couponCode,
      couponDiscount,
      productDiscount: cartTotalOriginal - cartTotalDiscounted,
      discountAmount: cartTotalOriginal - finalAmount,
      status: 'Placed',
    });

    if (couponCode) {
      const currentUsage = user.couponUsage.get(couponCode) || 0;
      user.couponUsage.set(couponCode, currentUsage + 1);
    }

    await newOrder.save();

    for (let item of items) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.product,
          quantity: { $gte: item.quantity } 
        },
        {
          $inc: { quantity: -item.quantity }
        },
        { new: true }
      );

      if (!updatedProduct) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.product.name || 'a product'}`
        });
      }
    }

    user.wishlist = user.wishlist.filter(productId =>
      !items.some(item => item.product.toString() === productId.toString())
    );

    user.cart = [];
    await user.save();

    delete req.session.coupon;

    res.redirect('/user/order-success');
  }catch (err) {
    next(err);
  }
}

const createRazorpayOrder = async (req, res,next) => {
  try {
    const amount = req.body.amount;

    const options = {
      amount: amount * 100,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

const getOrderSuccessPage = async (req, res,next) => {
  try {
    res.render('order-success', {
      userData: req.session.user
    });
  } catch (error) {
    next(err);
  }
};

const getOrderFailurePage = async (req, res,next) => {
  try {
    
    res.render('order-failure', {
      userData: req.session.user
    });
  } catch (error) {
    next(err);
  }
};

const getaddAddress = async(req,res,next)=>{
  try{
    res.render('addAddress',
      {userData : req.session.user,
      address : null,
      formAction : '/user/checkout/addAddress'}
    )
  }catch(err){
    next(err);
  }
}

const postaddAddress = async(req,res,next)=>{
    try{
        const userId = req.session.user._id;
        const{
            addressType, name, city, state,
            landmark, pincode, phone, altPhone
        }=req.body;

    if(!addressType || !name || !city || !state || !landmark || !pincode || !phone || !altPhone){
        return res.render('addAddress',{
            userData:req.session.user,
            error:'All fields are required'
        });
    }

    const existing = await Address.findOne({userId});

    if(existing){
        existing.address.push({
            addressType,name,city,state,landmark,
            pincode,phone,altPhone
        });
        await existing.save();
    }else{
        await Address.create({
            userId,
            address:[{
                addressType, name, city, state, landmark, pincode, phone, altPhone
            }]
        });
    }

    res.redirect('/user/checkout');
}catch(err){
    next(err);
}
};

module.exports={
    getCheckoutPage,
    placeOrder,
    getOrderSuccessPage,
    createRazorpayOrder,
    getOrderFailurePage,
    getaddAddress,
    postaddAddress,
}