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

const loadSignup = (req, res) => {
  try {
    res.render("signup",{
    pageTitle: "Sign Up",
    path: "/signup",
    googleClientId: process.env.GOOGLE_CLIENT_ID
  });
  } catch (error) {
    console.error("Error loading signup page:", error)
    res.status(500).render("error", { message: "Failed to load signup page" })
  }
}

const signupStep1 = async (req, res) => {
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
    console.error("Signup error:", err)
    return res.status(500).json({ errors: { general: "Failed to process signup. Try again later." } })
  }
}

const googleSignIn = async (req, res) => {
  try {
    const { name, email, picture } = req.body

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required from Google" })
    }

    const user = await User.findOne({ email })

    if (user) {
      if (user.isBlocked) {
        return res.status(403).json({ error: "Your account has been blocked by the admin." })
      }

      req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      }

      return res.json({ success: true, message: "Login successful", redirect: "/user/home" })
    } else {
      const newUser = await User.create({
        name,
        email,
        phone:"0000000000",
        password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
        isGoogleUser: true,
        profilePicture: picture || "",
        isVerified: true, 
      })

      req.session.user = {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
      }

      return res.json({ success: true, message: "Account created successfully", redirect: "/user/home" })
    }
  } catch (error) {
    console.error("Google Sign-In Error:", error)
    return res.status(500).json({ error: "Failed to process Google sign-in. Please try again." })
  }
}

const verifyOtp = async (req, res) => {
  const { otp } = req.body
  const { tempUser } = req.session

  // Validate OTP
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
      referralCode: generateReferralCode(tempUser.name), // helper function
      wallet: referredBy ? 50 : 0 // ₹50 for new user if referred
    })

    if (referredBy) {
      const referrer = await User.findById(referredBy);
      if (referrer) {
        referrer.wallet += 100; // ₹100 for referrer
        await referrer.save();
      }
    }

    req.session.tempUser = null
    return res.json({ success: true, referralRewarded: true });
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Signup failed." })
  }
}

const resendOtp = async (req, res) => {
  try {
    const tempUser = req.session.tempUser
    if (!tempUser) {
      return res.status(400).json({
        error: "Session expired. Please start over.",
      })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpires = Date.now() + 3 * 60 * 1000 // 5 minutes
    console.log('resend otp for signup:',otp);
    req.session.tempUser.otp = otp
    req.session.tempUser.otpExpires = otpExpires

    // Send verification email
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
  } catch (error) {
    console.error("Resend OTP error:", error)
    res.status(500).json({
      error: "Failed to resend OTP. Please try again.",
    })
  }
}

const pageNotFound = async (req, res) => {
  try {
    res.render("pageNotFound")
  } catch (error) {
    res.redirect("/pageNotFound")
  }
}

const homePage = async (req, res) => {
  try {
    const products = await Product.find({ isBlocked: false })
    .populate('category')
    .sort({
      createdAt: -1,
    })
    .limit(4)
    const user = await User.findById(req.session.user._id);
    
    for (let product of products) {
      const basePrice = Number(product.price);


      if (!basePrice || isNaN(basePrice)) {
        console.error(`Invalid price for product: ${product._id}`);
        continue;
      }

      const productOffer = Number(product.productOffer) || 0;
      const categoryOffer = Number(product.category.categoryOffer) || 0;

      const maxOffer = Math.max(productOffer, categoryOffer);

      const discount = Math.round((basePrice * maxOffer) / 100);
      const finalPrice = basePrice - discount;


      product.appliedOffer = isNaN(maxOffer) ? 0 : maxOffer;
      product.discountedPrice = isNaN(finalPrice) ? basePrice : finalPrice;

      await product.save();
  }

    res.render("homePage", { products, userData: user })
  } catch (err) {
    console.error(err)
    res.status(500).render("error", { message: "Server Error" })
  }
}

const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("login", { errors: {}, formData: {} })
    } else {
      return res.redirect("/user/home")
    }
  } catch (error) {
    console.error("Login Page Error:", error)
    return res.redirect("/pageNotFound")
  }
}

const login = async (req, res) => {
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
  } catch (error) {
    console.error("Login Error:", error)
    return res.render("login", {
      errors: { login: { msg: "Something went wrong, try again!" } },
      formData: { email: req.body.email },
    })
  }
}

const loadForgotPassword = async (req, res) => {
  res.render("forgot-password", { errors: {} })
}

const forgotPassword = async (req, res) => {
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

    // Store token in session (instead of database)
    req.session.resetToken = resetToken
    req.session.resetEmail = email
    req.session.resetTokenExpiration = Date.now() + 3600000 // Token valid for 1 hour

    // Send reset email
    const resetLink = `http://localhost:3000/user/reset-password?token=${resetToken}`
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
  } catch (error) {
    console.error("forgot-password error:", error)
    res.status(500).json({ error: "An error occured. please try again." })
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

const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body
    const errors = {}

    // Validate session
    if (!req.session.resetEmail) {
      return res.redirect("/user/forgot-password")
    }

    const email = req.session.resetEmail

    // Validate passwords
    if (!newPassword || newPassword.length < 6) {
      errors.newPassword = "Password must be at least 6 characters"
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }

    if (Object.keys(errors).length > 0) {
      return res.render("reset-password", { errors, email })
    }

    // Find user and update password
    const user = await User.findOne({ email })
    if (!user) {
      return res.render("reset-password", {
        errors: { email: "User not found" },
        email,
      })
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    // Clear session data after successful password reset
    req.session.resetToken = undefined
    req.session.resetEmail = undefined
    req.session.resetTokenExpiration = undefined

    res.redirect("/user/login")
  } catch (error) {
    console.error("Reset Password Error:", error)
    res.render("reset-password", {
      errors: { newPassword: "Something went wrong, try again!" },
      email: "",
    })
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
  googleSignIn,
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
