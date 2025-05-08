const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');

const downloadInvoice = async(req,res)=>{
    const doc = require('pdfkit');
    try{
        const userId = req.session.user._id;
        const orderId = req.params.id;

        const order = await Order.findOne({_id:orderId, user:userId}).populate('items.product');

        if(!order){
            return res.status(404).render('error',{message:'Order not found'});
        }

        const doc = new PDFDocument({margin:50})

        res.setHeader('Content-Type','application/pdf');
        res.setHeader('Content-Disposition',`attachment; filename=invoice-${order._id}.pdf`);

        doc.pipe(res);

        doc.fontSize(20).fillColor('#007D8B').text('Bookly-Invoice',{align:'center'});
        doc.moveDown();

        doc.fontSize(12).fillColor('#333').text(`Order Id:${order.orderId}`);
        doc.text(`Order Date:${new Date(order.createdAt).toLocaleDateString()}`);
        doc.text(`Payment Method: ${order.paymentMethod}`);
        doc.text(`Order Status: ${order.status}`);
        doc.moveDown();

        doc.fontSize(14).fillColor('#007D8B').text('Shipping Address');
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#333')
            .text(order.address.name)
            .text(`${order.address.city}, ${order.address.state} - ${order.address.pincode}`)
            .text(`Phone: ${order.address.phone}, Alt:${order.address.altPhone}`);
        doc.moveDown();
    

    doc.fontSize(14).fillColor('#007D8B').text('Items Ordered');
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#333')
      .text(`Subtotal: ₹${order.totalAmount + (order.discountAmount || 0)}`)
      .text(`Discount: -₹${order.totalAmount.toFixed(2)}`);

    doc.end();

}catch(error){
    console.error('Download Invoice error:',error);
    res.status(500).render('error',{message:'Failed to generate invoice'});
}
};

const getAllAddresses = async(req,res)=>{
    try{
        const userId = req.session.user._id;
        const userAddresses = await Address.findOne({userId});

        res.render('userLayout',{
            body:'addresses',
            userData:req.session.user,
            addressData:userAddresses?.address || []
        });
    }catch(error){
        console.error('Error loading addresses:',error);
        res.status(500).render('error',{message:'Failed to load addresses'});
    }
};

const getAddAddressPage = (req,res)=>{
    try{
        res.render('userLayout',{
            body:'addAddress',
            userData:req.session.user,
            address:null,
            formAction:'/user/profile/addresses/add'
        });
    }catch(error){
        console.error('Error loading add address page:',error);
        res.status(500).render('error',{message:'Add address page failed'});
    }
};

const postAddAddress = async(req,res)=>{
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
}catch(error){
    console.error('Error adding address:',error);
    res.render(500).render('error',{message:'Failed to add address'});
}
};

const getEditAddressPage = async (req,res)=>{
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
    }catch(error){
        console.error('Error loading address for edit:',error);
        res.status(500).render('error',{message:'failed to load address for editing'});
    }
};

const postEditAddress = async(req,res)=>{
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
    }catch(error){
        console.error('Error updating address:',error);
        res.status(500).render('error',{message:'Failed to update address'});
    }
};

const deleteAddress = async(req,res)=>{
    try{
        const userId = req.session.user._id;
        const addressId =req.params.addressId;

        const userAddresses = await Address.findOne({userId});

        userAddresses.address = userAddresses.address.filter(
            addr=>addr._id.toString() !== addressId
        );

        await userAddresses.save();
        res.redirect('/user/profile/addresses');
    }catch(error){
        console.error('Error deleting address:',error);
        res.status(500).render('error',{message:'Failed to delete address'});
    }
};

const getProfilePage = async(req,res)=>{
    try{
        const user = req.session.user;
        const userData = await User.findById(user._id);
        const addressData = await Address.findOne({ userId: user._id });
        res.render('userLayout',{body:'profile',
            userData,
            addressData: addressData?.address || []
        })
    }catch(error){
        console.error(error);
        res.status(500).render('error', { message: "can't get user profile" });
    }
}

const getEditProfile = async(req,res)=>{
    try{
        const user = req.session.user;
        const userData = await User.findById(user._id)
        res.render('userLayout',{body:'editProfile',userData});
    }catch(error){
        console.error(error);
        res.status(500).render('error',{message:"Can't load edit profile page"});
    }
}

const postEditProfile = async (req, res) => {
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
    } catch (error) {
      console.error("Edit profile error:", error);
      res.status(500).render("error", { message: "Error updating profile." });
    }
};

const getVerifyOtp = (req, res) => {
res.render("userLayout", {
    body: "verifyOtp",
    userData: req.session.user
});
};
  
const postVerifyOtp = async (req, res) => {
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
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).render("error", { message: "OTP verification failed." });
    }
};

const getChangePassword = (req,res)=>{
    res.render('userLayout',{
        body:'changePassword',
        userData:req.session.user,
    });
};

const postChangePassword = async(req,res)=>{
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
    }catch(error){
        console.error('Password change error:',error);
        res.status(500).render('error',{message:'Password update failed'});
    }
};

const getOrdersPage = async(req,res)=>{
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
    }catch(error){
        console.error('Failed to load orders:',error);
        res.status(500).render('error',{message:'could not load order history.'});
    }
};

const getOrderDetails = async(req,res)=>{
    try{
        const userId = req.session.user._id;
        const orderId = req.params.id;

        const order = await Order.findOne({_id:orderId, user:userId})
        .populate('items.product');

        if(!order){
            return res.status(404).render('error',{message:'Order not found'});
        }

        res.render('userLayout',{
            body:'orderDetails',
            userData:req.session.user,
            order
        });
    }catch(error){
        console.error('Error loading order details:',error);
        res.status(500).render('error',{message:'Failed to load order details'});
    }
};

const cancelOrder = async(req,res)=>{
    try{
        const orderId = req.params.id;
        const userId = req.session.user._id;

        const order = await Order.findOne({_id:orderId, user:userId});

        if(!order){
            return res.status(404).json({success:false,message:'Order not found'});
        }

        if(order.status!=='Placed'){
            return res.status(400).json({success:false,message:'Cannot cancel this order'});
        }

        order.status = 'Cancelled';
        await order.save();

        for (let item of order.items) {
            await Product.findByIdAndUpdate(item.product._id, {
              $inc: { quantity: item.quantity }
            });
          }

        return res.status(200).json({success:true, message:'Order cancelled'});
    }catch(error){
        console.error('cancel order error:',error);
        return res.status(500).json({success:false, message:'Server error'});
    }
}

const returnOrder = async (req, res) => {
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
      console.error('Return order error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit return request' });
    }
};
  
const cancelOrderItem = async (req, res) => {
    try {
      const { orderId, itemId } = req.params;
  
      const order = await Order.findById(orderId);
      if (!order) {
        return res.json({ success: false, message: 'Order not found' });
      }
  
      const item = order.items.id(itemId); 
      if (!item) {
        return res.json({ success: false, message: 'Item not found' });
      }
  
      if (item.status !== 'Placed') {
        return res.json({ success: false, message: 'Item already cancelled or returned' });
      }
  
      item.status = 'Cancelled';
      await order.save();
  
      res.json({ success: true, message: 'Product cancelled successfully!' });
    } catch (error) {
      console.error('Cancel product error:', error);
      res.json({ success: false, message: 'Failed to cancel product' });
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