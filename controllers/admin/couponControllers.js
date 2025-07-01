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

const updateCoupon = async (req, res, next) => {
  try {
    const id = req.params.id

    if (!id) throw new Error("Coupon ID is missing from request params")

    const { code, discountType, discountAmount, minCartAmount, maxDiscount, expiresAt, usageLimit } = req.body

    const errors = {}

    if (!code?.trim()) {
      errors.code = "Coupon code is required"
    } else {
      const trimmedCode = code.trim()
      if (trimmedCode.length < 3) {
        errors.code = "Coupon code must be at least 3 characters long"
      } else if (trimmedCode.length > 20) {
        errors.code = "Coupon code cannot exceed 20 characters"
      } else if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
        errors.code = "Coupon code can only contain uppercase letters and numbers"
      } else {
        const existingCoupon = await Coupon.findOne({
          code: trimmedCode.toUpperCase(),
          _id: { $ne: id },
        })
        if (existingCoupon) {
          errors.code = "This coupon code already exists"
        }
      }
    }

    if (!discountType || !["Flat", "Percentage"].includes(discountType)) {
      errors.discountType = "Please select a valid discount type (Flat or Percentage)"
    }

    if (!discountAmount) {
      errors.discountAmount = "Discount amount is required"
    } else {
      const amount = Number.parseFloat(discountAmount)
      if (isNaN(amount) || amount <= 0) {
        errors.discountAmount = "Discount amount must be greater than 0"
      } else if (discountType === "Percentage") {
        if (amount > 100) {
          errors.discountAmount = "Percentage discount cannot exceed 100%"
        } else if (amount < 1) {
          errors.discountAmount = "Percentage discount must be at least 1%"
        }
      } else if (discountType === "Flat") {
        if (amount > 50000) {
          errors.discountAmount = "Flat discount cannot exceed ₹50,000"
        } else if (amount < 1) {
          errors.discountAmount = "Flat discount must be at least ₹1"
        }
      }
    }

    if (discountType === "Percentage") {
      if (!maxDiscount) {
        errors.maxDiscount = "Maximum discount amount is required for percentage type"
      } else {
        const maxDiscountAmount = Number.parseFloat(maxDiscount)
        if (isNaN(maxDiscountAmount) || maxDiscountAmount <= 0) {
          errors.maxDiscount = "Maximum discount must be greater than 0"
        } else if (maxDiscountAmount > 50000) {
          errors.maxDiscount = "Maximum discount cannot exceed ₹50,000"
        } else if (minCartAmount && maxDiscountAmount >= Number.parseFloat(minCartAmount)) {
          errors.maxDiscount = "Maximum discount should be less than minimum cart amount"
        }
      }
    }

    if (minCartAmount !== undefined && minCartAmount !== "") {
      const minAmount = Number.parseFloat(minCartAmount)
      if (isNaN(minAmount) || minAmount < 0) {
        errors.minCartAmount = "Minimum cart amount cannot be negative"
      } else if (minAmount > 100000) {
        errors.minCartAmount = "Minimum cart amount cannot exceed ₹1,00,000"
      } else if (discountType === "Flat" && minAmount <= Number.parseFloat(discountAmount)) {
        errors.minCartAmount = "Minimum cart amount should be greater than flat discount amount"
      }
    }

    if (!usageLimit) {
      errors.usageLimit = "Usage limit is required"
    } else {
      const limit = Number.parseInt(usageLimit)
      if (isNaN(limit) || limit < 1) {
        errors.usageLimit = "Usage limit must be at least 1"
      } else if (limit > 100000) {
        errors.usageLimit = "Usage limit cannot exceed 1,00,000"
      }
    }

    if (!expiresAt) {
      errors.expiresAt = "Expiry date is required"
    } else {
      const expiryDate = new Date(expiresAt)
      const currentDate = new Date()
      const maxDate = new Date()
      maxDate.setFullYear(currentDate.getFullYear() + 5) 

      if (isNaN(expiryDate.getTime())) {
        errors.expiresAt = "Please enter a valid date"
      } else if (expiryDate <= currentDate) {
        errors.expiresAt = "Expiry date must be in the future"
      } else if (expiryDate > maxDate) {
        errors.expiresAt = "Expiry date cannot be more than 5 years from now"
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors })
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      {
        code: code.trim().toUpperCase(),
        discountType,
        discountAmount: Number.parseFloat(discountAmount),
        minCartAmount: minCartAmount ? Number.parseFloat(minCartAmount) : undefined,
        maxDiscount: discountType === "Percentage" ? Number.parseFloat(maxDiscount) : undefined,
        expiresAt: new Date(expiresAt),
        usageLimit: Number.parseInt(usageLimit),
        updatedAt: new Date(),
      },
      { new: true },
    )

    if (!updatedCoupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" })
    }

    res.json({ success: true, message: "Coupon updated successfully", coupon: updatedCoupon })
  } catch (err) {
    console.error("Error updating coupon:", err)
    if (err.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid coupon ID format" })
    }
    next(err)
  }
}

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

module.exports ={
    getCouponPage,
    createCoupon,
    deleteCoupon,
    loadEditCoupon,
    updateCoupon,
}
