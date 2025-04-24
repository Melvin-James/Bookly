const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

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

        const isMatch = awiat bcrypt.compare(currentPassword, userData.password);
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

module.exports={
    getProfilePage,
    getEditProfile,
    postEditProfile,
    getVerifyOtp,
    postVerifyOtp,
}