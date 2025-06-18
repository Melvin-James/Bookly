const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');

const downloadInvoice = async (req, res,next) => {
  try {
    const userId = req.session.user._id;
    const orderId = req.params.id;

    const order = await Order.findOne({ _id: orderId, user: userId }).populate('items.product');

    if (!order) {
      return res.status(404).render('error', { message: 'Order not found' });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).fillColor('#007D8B').text('Bookly - Invoice', { align: 'center' });
    doc.moveDown(1);

    // Order Info
    doc.fontSize(12).fillColor('#333')
      .text(`Order ID: ${order.orderId}`)
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`)
      .text(`Payment Method: ${order.paymentMethod}`)
      .text(`Order Status: ${order.status}`)
      .moveDown();

    // Shipping Address
    doc.fontSize(14).fillColor('#007D8B').text('Shipping Address');
    doc.moveDown(0.5);
    const { name, city, state, pincode, phone, altPhone } = order.address;
    doc.fontSize(12).fillColor('#333')
      .text(name)
      .text(`${city}, ${state} - ${pincode}`)
      .text(`Phone: ${phone}${altPhone ? `, Alt: ${altPhone}` : ''}`)
      .moveDown();

    // Items Table Header
    doc.fontSize(14).fillColor('#007D8B').text('Items Ordered');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const itemSpacing = 20;

    doc.fontSize(12).fillColor('#333');
    doc.text('Product', 50, tableTop);
    doc.moveDown(0.5);
    doc.text('Qty', 250, tableTop);
    doc.text('Price (₹)', 300, tableTop);
    doc.text('Discounted (₹)', 380, tableTop);
    doc.text('Total (₹)', 480, tableTop);

    let y = tableTop + 15;
    let subtotal = 0;

    order.items.forEach(item => {
      const { product, quantity, originalPrice, discountedPrice } = item;
      const itemTotal = discountedPrice * quantity;
      subtotal += itemTotal;

      doc.text(product.name, 50, y, { width: 180 });
      doc.text(quantity.toString(), 250, y);
      doc.text(originalPrice.toFixed(2), 300, y);
      doc.text(discountedPrice.toFixed(2), 380, y);
      doc.text(itemTotal.toFixed(2), 480, y);
      y += itemSpacing;
    });

    doc.moveDown(2);

    const discountAmount = order.discountAmount || 0;
    const totalBeforeDiscount = order.totalAmount + discountAmount;

    // Summary
    doc.fontSize(14).fillColor('#007D8B').text('Order Summary');
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#333')
      .text(`Subtotal (Before Discounts): ₹${totalBeforeDiscount.toFixed(2)}`)
      .text(`Total Discounts (offer + Coupon): -₹${discountAmount.toFixed(2)}`)
      .text(`Total Paid: ₹${order.totalAmount.toFixed(2)}`);

    doc.end();

  } catch (err) {
    next(err)
  }
};

const getAllAddresses = async(req,res,next)=>{
    try{
        const userId = req.session.user._id;
        const userAddresses = await Address.findOne({userId});

        res.render('userLayout',{
            body:'addresses',
            userData:req.session.user,
            addressData:userAddresses?.address || []
        });
    }catch(err){
       next(err)
    }
};

const getAddAddressPage = (req,res,next)=>{
    try{
        res.render('userLayout',{
            body:'addAddress',
            userData:req.session.user,
            address:null,
            formAction:'/user/profile/addresses/add'
        });
    }catch(error){
        next(err);
    }
};

const postAddAddress = async(req,res,next)=>{
    try{
        const userId = req.session.user._id;
        const{
            addressType, name, city, state,
            landmark, pincode, phone, altPhone
        }=req.body;

    if(!addressType || !name || !city || !state || !landmark || !pincode || !phone || !altPhone){
        return res.render('userLayout',{
            body:'addAddress',
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

    res.redirect('/user/profile/addresses');
}catch(err){
    next(err);
}
};

const getEditAddressPage = async (req,res,next)=>{
    try{
        const userId = req.session.user._id;
        const addressId = req.params.addressId;

        const userAddresses = await Address.findOne({userId});
        const addressToEdit = userAddresses?.address.id(addressId);

        if(!addressToEdit) throw new Error('Address not found');

        res.render('userLayout',{
            body:'addAddress',
            userData:req.session.user,
            address:addressToEdit,
            formAction:`/user/profile/addresses/edit/${addressId}`
        });
    }catch(err){
       next(err)
    }
};

const postEditAddress = async(req,res,next)=>{
    try{
        const userId = req.session.user._id;
        const addressId = req.params.addressId;
        const{
            addressType,name,city,state,
            landmark,pincode,phone, altPhone
        }=req.body;

        const userAddresses = await Address.findOne({userId});
        const addressToEdit = userAddresses.address.id(addressId);

        if(!addressToEdit) throw new Error('Address not found');

        Object.assign(addressToEdit, {
            addressType, name, city, state, landmark, pincode, phone, altPhone
        });

        await userAddresses.save();
        res.redirect('/user/profile/addresses');
    }catch(err){
        next(err);
    }
};

const deleteAddress = async(req,res,next)=>{
    try{
        const userId = req.session.user._id;
        const addressId =req.params.addressId;

        const userAddresses = await Address.findOne({userId});

        userAddresses.address = userAddresses.address.filter(
            addr=>addr._id.toString() !== addressId
        );

        await userAddresses.save();
        res.redirect('/user/profile/addresses');
    }catch(err){
        next(err);
    }
};

const getProfilePage = async(req,res,next)=>{
    try{
        const user = req.session.user;
        const userData = await User.findById(user._id);
        const addressData = await Address.findOne({ userId: user._id });
        res.render('userLayout',{body:'profile',
            userData,
            addressData: addressData?.address || []
        })
    }catch(err){
        next(err);
    }
}

const getEditProfile = async(req,res,next)=>{
    try{
        const user = req.session.user;
        const userData = await User.findById(user._id)
        res.render('userLayout',{body:'editProfile',userData});
    }catch(err){
        next(err);
    }
}

const postEditProfile = async (req, res,next) => {
    try {
      const userId = req.session.user._id;
      const userData = await User.findById(userId);
  
      const { name, email, phone } = req.body;
      const userImage = req.file ? req.file.filename : userData.userImage?.[0];
  
      const emailChanged = email !== userData.email;
  
      if (emailChanged) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 5 * 60 * 1000; 
        console.log('otp for edit email in user profile:',otp);
        await User.findByIdAndUpdate(userId, {
          name,
          phone,
          userImage: [userImage],
          otp,
          otpExpires
        });
  
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD
          }
        });
  
        await transporter.sendMail({
          from: `"Bookly Support" <${process.env.NODEMAILER_EMAIL}>`,
          to: email,
          subject: 'Email Verification OTP - Bookly',
          text: `Your OTP for email verification is ${otp}. It expires in 5 minutes.`
        });
  
        req.session.newEmail = email;
        return res.redirect('/user/profile/verify-otp');
      }
  
      await User.findByIdAndUpdate(userId, {
        name,
        email,
        phone,
        userImage: [userImage]
      });
  
      res.redirect('/user/profile');
    } catch (err) {
      next(err);
    }
};

const getVerifyOtp = (req, res) => {
res.render("userLayout", {
    body: "verifyOtp",
    userData: req.session.user
});
};
  
const postVerifyOtp = async (req, res, next) => {
    try {
      const userId = req.session.user._id;
      const userData = await User.findById(userId);
      const enteredOtp = req.body.otp;
  
      if (
        userData.otp === enteredOtp &&
        Date.now() < userData.otpExpires
      ) {
        await User.findByIdAndUpdate(userId, {
          email: req.session.newEmail,
          $unset: { otp: 1, otpExpires: 1 }
        });
  
        delete req.session.newEmail;
        return res.redirect("/user/profile");
      }
  

      res.render("userLayout", {
        body: "verifyOtp",
        userData,
        error: "Invalid or expired OTP. Please try again."
      });
    } catch (err) {
      next(err);
    }
};

const getChangePassword = (req,res)=>{
    res.render('userLayout',{
        body:'changePassword',
        userData:req.session.user,
    });
};

const postChangePassword = async(req,res,next)=>{
    try{
        const {currentPassword, newPassword, confirmPassword}=req.body;
        const userId = req.session.user._id;
        const userData = await User.findById(userId);

        const isMatch = await bcrypt.compare(currentPassword, userData.password);
        if(!isMatch){
            return res.render('userLayout',{
                body:'changePassword',
                userData,
                error:'Current password is incorrect',
            })
        }

        if(newPassword !== confirmPassword){
            return res.render('userLayout',{
                body:'changePassword',
                userData,
                error:'New passwords do not match',
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(userId,{password:hashedPassword});

        return res.render('userLayout',{
            body:'changePassword',
            userData,
            success:'Password changed successfully',
        });
    }catch(err){
        next(err);
    }
};

const getOrdersPage = async(req,res,next)=>{
    try{
        const userId = req.session.user._id;
        const searchQuery = req.query.search || '';

        let query = { user: userId };

        if (searchQuery) {
        query.orderId = { $regex: searchQuery, $options: 'i' };
        }


        const orders = await Order.find(query)
          .sort({createdAt:-1})
          .populate('items.product');

          res.render('userLayout',{
            body:'orders',
            userData:req.session.user,
            orders
          });
    }catch(err){
        next(err);
    }
};

const getOrderDetails = async(req,res,next)=>{
    try{
        const userId = req.session.user._id;
        const orderId = req.params.id;

        const order = await Order.findOne({_id:orderId, user:userId})
        .populate('items.product');

        if(!order){
            return res.status(404).render('error',{message:'Order not found'});
        }

        const canDownloadInvoice = !['Cancelled','Failed'].includes(order.status);

        res.render('userLayout',{
            body:'orderDetails',
            userData:req.session.user,
            order,
            canDownloadInvoice,
        });
    }catch(err){
        next(err);
    }
};

const cancelOrder = async (req, res,next) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user._id;

    const order = await Order.findOne({ _id: orderId, user: userId }).populate('items.product');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'Placed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel this order' });
    }


    for (let item of order.items) {
      if(item.status !=='Cancelled'){
        await Product.findByIdAndUpdate(item.product._id, {
          $inc: { quantity: item.quantity },
        });
      }
    }

    if (order.paymentMethod === 'Online') {
      const user = await User.findById(userId);
      
      let refundAmount = 0;
      for (const item of order.items) {
        if (item.status !== 'Cancelled') {
          let discountTotal = order.items.reduce((sum, item) => sum + item.discountedPrice * item.quantity, 0);
          let itemTotal = item.discountedPrice * item.quantity;
          let couponShare = (itemTotal / discountTotal) * order.couponDiscount;
          refundAmount += (itemTotal - couponShare);
        }
      }

      user.wallet = (user.wallet || 0) + refundAmount;

      const walletTransaction = {
        type: 'credit',
        amount: refundAmount,
        description: `Refund for cancelled order ${order.orderId}`,
        orderId: order.orderId,
      };

      user.walletTransactions.push(walletTransaction);

      await user.save();

      order.status = 'Cancelled';
      for (let item of order.items) {
        item.status = 'Cancelled';
      }

      await order.save();
    }
    return res.status(200).json({ success: true, message: 'Order cancelled and amount refunded (if applicable)' });
  } catch (err) {
    next(err);
  }
};

const returnOrder = async (req, res,next) => {
    try {
      const userId = req.session.user._id;
      const orderId = req.params.id;
      const { reason } = req.body;

      const order = await Order.findOne({ _id: orderId, user: userId });
  
      if (!order || order.status !== 'Delivered') {
        return res.status(400).json({ success: false, message: 'Invalid order for return' });
      }
  
      order.isReturnRequested = true;
      order.returnReason = reason;

      await order.save();
      
      res.json({ success: true, message: 'Return request submitted successfully' });
  
    } catch (error) {
      next(err);
    }
};
  
const cancelOrderItem = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;
    const userId = req.session.user._id;

    const order = await Order.findOne({ _id: orderId, user: userId }).populate('items.product');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const item = order.items.find(i => i._id.toString() === productId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in this order.' });
    }

    if (item.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'This item is already cancelled.' });
    }

    item.status = 'Cancelled';

    await Product.findByIdAndUpdate(item.product._id, {
      $inc: { quantity: item.quantity }
    });

    if (order.paymentMethod === 'Online') {
      const totalDiscounted = order.items.reduce((sum, i) => sum + i.discountedPrice * i.quantity, 0);
      const couponDiscount = order.couponDiscount || 0;

      const itemTotal = item.discountedPrice * item.quantity;
      const couponShare = (itemTotal / totalDiscounted) * couponDiscount;
      const refundAmount = itemTotal - couponShare;

      await User.findByIdAndUpdate(userId, {
        $inc: { wallet: refundAmount },
        $push: {
          walletTransactions: {
            type: "credit",
            amount: refundAmount,
            description: `Refund for order ${order.orderId}`,
            orderId: order.orderId
          }
        }
      });
    }

    const allItemsCancelled = order.items.every(item=>item.status === 'Cancelled');

    if(allItemsCancelled){
      order.status = 'Cancelled';
    }
    
    await order.save();

    return res.json({ success: true, message: 'Product cancelled successfully.' });

  } catch (error) {
    next(err);
  }
};

module.exports={
    getProfilePage,
    getEditProfile,
    postEditProfile,
    getVerifyOtp,
    postVerifyOtp,
    getChangePassword,
    postChangePassword,
    getAllAddresses,
    getAddAddressPage,
    postAddAddress,
    getEditAddressPage,
    postEditAddress,
    deleteAddress,
    getOrdersPage,
    getOrderDetails,
    cancelOrder,
    returnOrder,
    downloadInvoice,
    cancelOrderItem,
}