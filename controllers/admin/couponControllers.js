const Coupon = require('../../models/couponSchema');

const loadEditCoupon = async (req,res,next)=>{
    try{
        const coupon = await Coupon.findById(req.params.id);
        if(!coupon) return res.redirect('/admin/coupons');

        res.render('adminEditCoupon',{coupon, errors:{}});
    }catch(err){
        next(err)
    }
};

const updateCoupon = async(req,res,next)=>{
    try{

        const id = req.params.id;
        if (!id) throw new Error('Coupon ID is missing from request params');

        const {code, discountType, discountAmount, minCartAmount, maxDiscount, expiresAt, usageLimit} = req.body;
        const errors = {};

        if(!code?.trim()) errors.code ='Code is required';
        if(!discountType || !['Flat', 'Percentage'].includes(discountType)) errors.discountType = 'Invalid discount type';
        if(!discountAmount || discountAmount <= 0) errors.discountAmount = 'Discount must be greater than 0';
        if(!expiresAt || new Date(expiresAt) < new Date()) errors.expiresAt = 'Expiry must be in the future';

        if(discountType === 'Percentage' && (!maxDiscount || maxDiscount <=0)){
            errors.maxDiscount = 'Max discount is required for percentage type';
        }

        if(Object.keys(errors).length > 0) return res.status(400).json({success: false, errors});

        await Coupon.findByIdAndUpdate(req.params.id,{
            code:code.trim().toUpperCase(),
            discountType,
            discountAmount,
            minCartAmount,
            maxDiscount:discountType === 'Percentage' ? maxDiscount : undefined,
            expiresAt,
            usageLimit,
        });

        res.json({success:true});
    }catch(err){
        next(err);
    }
};

const getCouponPage = async (req,res,next)=>{
    try{
        const coupons = await Coupon.find().sort({createdAt:-1});
        res.render('layout',{
            body:'adminCouponList',
            admin:req.session.admin,
            coupons,
            req,
        });
    }catch(err){
        next(err);
    };
}

const createCoupon = async (req,res,next)=>{
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
        next(err);
    }
};

const deleteCoupon = async(req,res,next)=>{
    try{
        const couponId = req.params.id;
        const deleted = await Coupon.findByIdAndDelete(couponId);

        if(!deleted){
            return res.status(404).json({success:false,message:'Coupon not found'});
        }
        res.json({success:true});
    }
    catch(error){
        next(err);
    }
};

const editCoupon = async(req,res,next)=>{
    try{
        const {id} = req.params;
        const updateFields = req.body;

        await Coupon.findByIdAndUpdate(id,updateFields,{runValidators:true});
        res.redirect('/admin/coupons?updated=true');
    }catch(error){
        next(err);
    }
};

module.exports ={
    getCouponPage,
    createCoupon,
    deleteCoupon,
    loadEditCoupon,
    updateCoupon,
    editCoupon,
}
