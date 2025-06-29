require('dotenv').config();
const path = require("path")
const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt")
const crypto = require("crypto")
const generateReferralCode = require('../../utils/generateReferralCode');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
})

const loadSignup = (req, res, next) => {
  try {
    res.render("signup",{
    pageTitle: "Sign Up",
    path: "/signup",
    googleClientId: process.env.GOOGLE_CLIENT_ID
  });
  } catch (err) {
    next(err);
  }
}

const signupStep1 = async (req, res, next) => {
  const { name, email, phone, password, confirmPassword, referralCode } = req.body
  const errors = {}

  if (!name || name.trim() === "") {
    errors.name = "Name is required"
  } else if (name.length < 2) {
    errors.name = "Name must be at least 2 characters long"
  }

  if (!email || email.trim() === "") {
    errors.email = "Email is required"
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errors.email = "Please provide a valid email address"
    }
  }

  if (!phone || phone.trim() === "") {
    errors.phone = "Phone number is required"
  } else {
    const phoneRegex = /^[0-9]{10}$/
    if (!phoneRegex.test(phone.replace(/\D/g, ""))) {
      errors.phone = "Please provide a valid 10-digit phone number"
    }
  }

  if (!password) {
    errors.password = "Password is required"
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters long"
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your password"
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match"
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors })
  }

  try {
    const existing = await User.findOne({ $or: [{ email }, { phone }] })
    if (existing) {
      return res.status(409).json({
        errors: {
          general: existing.email === email ? "Email already exists" : "Phone number already exists",
        },
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    console.log("otp for signup:", otp);

    let referredBy = null;

    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        referredBy = referrer._id;
      }
    }

    req.session.tempUser = {
      name,
      email,
      phone,
      password: hashedPassword,
      otp,
      otpExpires: Date.now() + 60 * 3000,
      referredBy, 
      referralCodeUsed: referralCode || null,
    }
    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Your Bookly OTP Code",
      text: `Your OTP code is ${otp}. It is valid for 1 minute.`,
    }

    await transporter.sendMail(mailOptions)
    return res.json({ success: true })
  } catch (err) {
    next(err);
  }
}

const verifyOtp = async (req, res, next) => {
  const { otp } = req.body
  const { tempUser } = req.session

  if (!otp) {
    return res.status(400).json({ error: "OTP is required." })
  }

  if (!tempUser) {
    return res.status(400).json({ error: "Session expired. Please start over." })
  }

  if (tempUser.otp !== otp) {
    return res.status(400).json({ error: "Invalid OTP. Please try again." })
  }

  if (Date.now() > tempUser.otpExpires) {
    return res.status(400).json({ error: "OTP has expired. Please request a new one." })
  }

  try {
    const referredBy = tempUser.referredBy || null;

    const user = await User.create({
      name: tempUser.name,
      email: tempUser.email,
      phone: tempUser.phone,
      password: tempUser.password,
      referredBy,
      referralCode: generateReferralCode(tempUser.name), 
      wallet: referredBy ? 50 : 0 
    })

    if (referredBy) {
      const referrer = await User.findById(referredBy);
      if (referrer) {
        referrer.wallet += 100;
        await referrer.save();
      }
    }

    req.session.tempUser = null
    return res.json({ success: true, referralRewarded: true });
  } catch (err) {
    next(err);
  }
}

const resendOtp = async (req, res, next) => {
  try {
    const tempUser = req.session.tempUser
    if (!tempUser) {
      return res.status(400).json({
        error: "Session expired. Please start over.",
      })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpires = Date.now() + 3 * 60 * 1000
    console.log('resend otp for signup:',otp);
    req.session.tempUser.otp = otp
    req.session.tempUser.otpExpires = otpExpires

    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: tempUser.email,
      subject: "Your Bookly OTP Code",
      text: `Your OTP code is ${otp}. It is valid for 5 minutes.`,
    }

    await transporter.sendMail(mailOptions)

    return res.json({
      success: true,
      message: "New OTP sent to your email",
    })
  } catch (err) {
    next(err);
  }
}

const pageNotFound = async (req, res, next) => {
  try {
    res.render("pageNotFound")
  } catch (error) {
    res.redirect("/pageNotFound")
  }
}

const homePage = async (req, res, next) => {
  try {
    const products = await Product.find({ isBlocked: false })
      .populate('category')
      .sort({ createdAt: -1 })
      .limit(4);

    const isLoggedIn = !!req.session.user;
    let user = null;

    if (isLoggedIn) {
      user = await User.findById(req.session.user._id);
    }

    for (let product of products) {
      const basePrice = Number(product.price);

      if (!basePrice || isNaN(basePrice)) {
        console.error(`Invalid price for product: ${product._id}`);
        continue;
      }

      const productOffer = Number(product.productOffer) || 0;
      const categoryOffer = Number(product.category?.categoryOffer) || 0;

      const maxOffer = Math.max(productOffer, categoryOffer);

      const discount = Math.round((basePrice * maxOffer) / 100);
      const finalPrice = basePrice - discount;

      product.appliedOffer = isNaN(maxOffer) ? 0 : maxOffer;
      product.discountedPrice = isNaN(finalPrice) ? basePrice : finalPrice;

      await product.save();
    }

    res.render("homePage", {
      products,
      userData: user,  
      isLoggedIn       
    });

  } catch (err) {
    next(err);
  }
};

const loadLogin = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.render("login", { errors: {}, formData: {} })
    } else {
      return res.redirect("/user/home")
    }
  } catch (err) {
    next(err);
  }
}

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const errors = {}

    if (!email) {
      errors.email = { msg: "Email is required" }
    }

    if (!password) {
      errors.password = { msg: "Password is required" }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (email && !emailRegex.test(email)) {
      errors.email = { msg: "Invalid email format" }
    }

    if (Object.keys(errors).length > 0) {
      return res.render("login", { errors, formData: { email } })
    }

    const user = await User.findOne({ email })
    if (!user || user.isAdmin) {
      return res.render("login", {
        errors: { login: { msg: "Invalid email or password" } },
        formData: { email},
      })
    }

    if (user.isBlocked) {
      return res.render("login", {
        errors: {
          login: { msg: "Your account has been blocked by the admin." },
        },
        formData: { email },
      })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.render("login", {
        errors: { login: { msg: "Invalid email or password" } },
        formData: { email },
      })
    }

    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    }

    return res.redirect("/user/home")
  } catch (err) {
    next(err);
  }
}

const loadForgotPassword = async (req, res) => {
  res.render("forgot-password", { errors: {} })
}

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body
    const errors = {}

    if (!email) {
      errors.email = "Email is required"
    }

    const user = await User.findOne({ email })
    if (!user) {
      errors.email = "User is not registered"
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email)) {
      errors.email = "Invalid email format"
    }

    if (Object.keys(errors).length > 0) {
      return res.json({ errors })
    }

    const resetToken = crypto.randomBytes(32).toString("hex")

    req.session.resetToken = resetToken
    req.session.resetEmail = email
    req.session.resetTokenExpiration = Date.now() + 3600000 

    const resetLink = `${process.env.RESET_LINK}?token=${resetToken}`
    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Password Reset Request - Bookly",
      html: `<p>You requested a password reset. Click the link below to reset your password:</p>
                   <a href="${resetLink}">${resetLink}</a>
                   <p>If you did not request this, please ignore this email.</p>`,
    }

    await transporter.sendMail(mailOptions)

    return res.json({ success: true, redirectTo: "/user/forgot-password" })
  } catch (err) {
    next(err)
  }
}

const loadResetPassword = async (req, res) => {
  const { token } = req.query
  console.log("From loadResetPassword controller:", token)
  if (!req.session.resetToken || req.session.resetToken !== token || Date.now() > req.session.resetTokenExpiration) {
    return res.render("reset-password", {
      errors: { token: "Invalid or expired token" },
      email: "",
    })
  }
  res.render("reset-password", { errors: {}, email: req.session.resetEmail })
}

const resetPassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body
    const errors = {}

    if (!req.session.resetEmail) {
      return res.redirect("/user/forgot-password")
    }

    const email = req.session.resetEmail

    if (!newPassword || newPassword.length < 6) {
      errors.newPassword = "Password must be at least 6 characters"
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }

    if (Object.keys(errors).length > 0) {
      return res.render("reset-password", { errors, email })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.render("reset-password", {
        errors: { email: "User not found" },
        email,
      })
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    req.session.resetToken = undefined
    req.session.resetEmail = undefined
    req.session.resetTokenExpiration = undefined

    res.redirect("/user/login")
  } catch (err) {
    next(err)
  }
}

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err)
      return res.status(500).json({ error: "Failed to logout" })
    }
    res.redirect("/user/login")
  })
}

module.exports = {
  loadSignup,
  signupStep1,
  verifyOtp,
  homePage,
  pageNotFound,
  loadLogin,
  login,
  resendOtp,
  loadForgotPassword,
  forgotPassword,
  loadResetPassword,
  resetPassword,
  logout,
}
