const Coupon = require('../../models/couponSchema');

const getCouponPage = async (req,res)=>{
    try{
        const coupons = await Coupon.find().sort({createdAt:-1});
        res.render('layout',{
            body:'adminCouponList',
            admin:req.session.admin,
            coupons,
            req,
        });
    }catch(err){
        console.error('Failed to load coupons:',err);
        res.status(500).render('error',{message : 'Failed to load coupon list'});
    };
}

const createCoupon = async (req,res)=>{
    try{
        const{
            code,
            discountType,
            discountAmount,
            minCartAmount,
            maxDiscount,
            expiresAt,
            usageLimit
        }=req.body;

        const existing = await Coupon.findOne({code:code.toUpperCase()});
        if(existing){
            return res.status(400).render('error',{message:'coupon code already exists!'});
        }

        const coupon = new Coupon({
            code:code.toUpperCase(),
            discountType,
            discountAmount,
            minCartAmount,
            maxDiscount:maxDiscount || undefined,
            expiresAt,
            usageLimit,
        });

        await coupon.save();
        res.redirect('/admin/coupons?created=true');
    }catch(error){
        console.error('Error creating coupon:',error);
        res.status(500).render('error',{message:'Failed to create coupon'});
    }
};

const deleteCoupon = async(req,res)=>{
    try{
        const couponId = req.params.id;
        const deleted = await Coupon.findByIdAndDelete(couponId);

        if(!deleted){
            return res.status(404).json({success:false,message:'Coupon not found'});
        }
        res.json({success:true});
    }
    catch(error){
        console.error('Failed to delete coupon:','error');
        res.status(500).json({success:false,message:'Error deleting coupon'});
    }
};

module.exports ={
    getCouponPage,
    createCoupon,
    deleteCoupon,
}
