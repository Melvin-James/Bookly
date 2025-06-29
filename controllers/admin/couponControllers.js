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

const createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      discountType,
      discountAmount,
      minCartAmount,
      maxDiscount,
      expiresAt,
      usageLimit
    } = req.body;

    const errors = {};

    if (!code || code.trim().length < 3 || !/^[A-Z0-9]+$/.test(code.trim().toUpperCase())) {
      errors.code = 'Coupon code must be at least 3 characters and contain only letters/numbers';
    } else {
      const existing = await Coupon.findOne({ code: code.toUpperCase() });
      if (existing) {
        errors.code = 'Coupon code already exists!';
      }
    }

    if (!discountType || !['Flat', 'Percentage'].includes(discountType)) {
      errors.discountType = 'Invalid discount type';
    }

    const discount = parseFloat(discountAmount);
    const minCart = parseFloat(minCartAmount);
    const max = parseFloat(maxDiscount);
    const usage = parseInt(usageLimit);

    if (!discountAmount || isNaN(discount) || discount <= 0) {
      errors.discountAmount = 'Discount amount must be a positive number';
    } else {
      if (discountType === 'Percentage' && discount > 100) {
        errors.discountAmount = 'Percentage discount cannot exceed 100%';
      }
      if (discountType === 'Flat' && discount > 10000) {
        errors.discountAmount = 'Flat discount cannot exceed ₹10,000';
      }
    }

    if (isNaN(minCart) || minCart < 0) {
      errors.minCartAmount = 'Minimum cart amount must be a non-negative number';
    }

    if (!isNaN(discount) && !isNaN(minCart) && discount > minCart) {
      errors.discountAmount = 'Discount cannot be greater than minimum cart amount';
    }

    if (discountType === 'Percentage') {
      if (maxDiscount && (isNaN(max) || max <= 0)) {
        errors.maxDiscount = 'Max discount must be a positive number';
      }
    }

    if (isNaN(usage) || usage < 1 || usage > 5) {
      errors.usageLimit = 'Usage limit must be between 1 and 5';
    }

    if (!expiresAt || isNaN(Date.parse(expiresAt))) {
      errors.expiresAt = 'Invalid expiry date';
    } else {
      const expiry = new Date(expiresAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiry <= today) {
        errors.expiresAt = 'Expiry date must be in the future';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discountType,
      discountAmount: discount,
      minCartAmount: minCart,
      maxDiscount: discountType === 'Percentage' ? max : undefined,
      expiresAt: new Date(expiresAt),
      usageLimit: usage
    });

    await coupon.save();
    return res.status(200).json({ success: true });

  } catch (err) {
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
    catch(err){
        next(err);
    }
};

const editCoupon = async(req,res,next)=>{
    try{
        const {id} = req.params;
        const updateFields = req.body;

        await Coupon.findByIdAndUpdate(id,updateFields,{runValidators:true});
        res.redirect('/admin/coupons?updated=true');
    }catch(err){
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
