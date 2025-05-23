const Coupon = require('../../models/couponSchema');
const cart = require('../../models/productSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');

const applyCoupon = async(req,res)=>{
    try{
        const userId = req.session.user._id;
        const {couponCode} = req.body;

        const coupon = await Coupon.findOne({code:couponCode.toUpperCase(),isActive:true});

        if(!coupon){
            return res.status(400).json({success:false,message:'Invalid coupon code!'});
        }

        if(coupon.expiresAt < Date.now()){
            return res.status(400).json({success:false,message:'Coupon expired!'});
        }

        const user = await User.findById(userId).populate('cart');

        if(!user || user.cart.length === 0){
            return res.status(400).json({success:false, message:'Cart is empty!'});
        }

        let cartTotal = 0;
        for (let cartItem of user.cart) {
            const product = await Product.findById(cartItem.product);
            if (product) {
                const offer = product.productOffer || 0;
                const discounted = product.price * (1-offer/100);
                cartTotal += discounted * cartItem.quantity;
            }
          }
          

        if(cartTotal < coupon.minCartAmount){
            return res.status(400).json({success:false,message:`Minimum cart amount should be ₹${coupon.minCartAmount}`});
        }

        let discount =0;
        if(coupon.discountType === 'Flat'){
            discount = coupon.discountAmount;
        }else if(coupon.discountType === 'Percentage'){
            discount = (coupon.discountAmount / 100)*cartTotal;
            if(coupon.maxDiscount && discount > coupon.maxDiscount){
                discount = coupon.maxDiscount;
            }
        }
        const finalTotal = cartTotal - discount;

        if (user.couponUsage?.get(coupon.code) >= coupon.usageLimit) {
            return res.status(400).json({
              success: false,
              message: 'Coupon usage limit reached!'
            });
          }
          

        req.session.coupon = {
            code:coupon.code,
            discountAmount:discount,
            finalTotal
        };

        return res.status(200).json({
            success:true,
            message:`Coupon applied successfully!`,
            discount,
            finalTotal
        });
    }catch(error){
        console.error('Apply coupon error:',error);
        res.status(500).json({success:false,message:'Server error!'});
    }
}

const removeCoupon = (req,res)=>{
    try{
        delete req.session.coupon;
        res.status(200).json({success:true,message:'Coupon removed successfully.'});
    }catch(error){
        console.error('Remove coupon error:',error);
        res.status(500).json({success:false,message:'Server error!'});
    }
};

module.exports = {
    applyCoupon,
    removeCoupon,
}