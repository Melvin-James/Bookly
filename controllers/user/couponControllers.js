const Coupon = require('../../models/couponSchema');
const cart = require('../../models/productSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const {COUPON}=require('../../config/messages');
const STATUS = require('../../config/statusCodes');

const applyCoupon = async(req,res,next)=>{
    try{
        const userId = req.session.user._id;
        const {couponCode} = req.body;

        const coupon = await Coupon.findOne({code:couponCode.toUpperCase(),isActive:true});

        if(!coupon){
            return res.status(STATUS.BAD_REQUEST).json({success:false,message:COUPON.INVALID});
        }

        if(coupon.expiresAt < Date.now()){
            return res.status(STATUS.BAD_REQUEST).json({success:false,message:COUPON.EXPIRED});
        }

        const user = await User.findById(userId).populate('cart');

        if(!user || user.cart.length === 0){
            return res.status(STATUS.BAD_REQUEST).json({success:false, message:COUPON.CART_EMPTY});
        }

        let cartTotal = 0;
        for (let cartItem of user.cart) {
            const product = await Product.findById(cartItem.product);
            if (product) {
                const offer = product.productOffer || 0;
                cartTotal += product.discountedPrice * cartItem.quantity;
            }
          }
          

        if(cartTotal < coupon.minCartAmount){
            return res.status(STATUS.BAD_REQUEST).json({success:false,message:COUPON.MIN_CART_AMOUNT});
        }

        let couponDiscount =0;
        if(coupon.discountType === 'Flat'){
            couponDiscount = coupon.discountAmount;
        }else if(coupon.discountType === 'Percentage'){
            couponDiscount = (coupon.discountAmount / 100)*cartTotal;
            if(coupon.maxDiscount && couponDiscount > coupon.maxDiscount){
                couponDiscount = coupon.maxDiscount;
            }
        }
        const finalTotal = cartTotal - couponDiscount;

        if (user.couponUsage?.get(coupon.code) >= coupon.usageLimit) {
            return res.status(STATUS.BAD_REQUEST).json({
              success: false,
              message: COUPON.USAGE_LIMIT
            });
          }
          

        req.session.coupon = {
            code:coupon.code,
            discountAmount:couponDiscount,
            finalTotal
        };

        return res.status(STATUS.CREATED).json({
            success:true,
            message: COUPON.APPLIED,
            couponDiscount,
            finalTotal
        });
    }catch(err){
        next(err);
    }
}

const removeCoupon = (req,res,next)=>{
    try{
        delete req.session.coupon;
        res.status(STATUS.CREATED).json({success:true,message:COUPON.REMOVED});
    }catch(err){
        next(err);
    }
};

module.exports = {
    applyCoupon,
    removeCoupon,
}