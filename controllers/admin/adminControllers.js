const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const rateLimit = require("express-rate-limit")
const { createStructParentTreeNextKey } = require('pdfkit');
const STATUS = require('../../config/statusCodes');
const {ADMIN} = require('../../config/messages');

const pageerror = async(req,res)=>{
    res.render('pageerror');
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    errors: {
      general: "Too many login attempts. Please try again in 15 minutes.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
})

const loadLogin = (req, res, next) => {
  try {
    if (req.session.admin) {
      return res.redirect("/admin/dashboard")
    }
    return res.render("admin-login", {
      errors: {},
      formData: {},
      title: "Admin Login - Bookly",
    })
  } catch (err) {
    console.error("Error loading admin login page:", err)
    next(err)
  }
}

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const errors = {}

    if (!email || typeof email !== "string") {
      errors.email = ADMIN.EMAIL_REQUIRED
    }

    if (!password || typeof password !== "string") {
      errors.password = ADMIN.PASSWORD_REQUIRED
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email.trim())) {
      errors.email = ADMIN.EMAIL_INVALID
    }

    if (password && password.length < 6) {
      errors.password = ADMIN.PASSWORD_MIN
    }

    if (email && email.trim().length > 254) {
      errors.email = ADMIN.EMAIL_TOO_LONG
    }

    if (password && password.length > 128) {
      errors.password = ADMIN.PASSWORD_MAX
    }

    const suspiciousPatterns = [/[<>"'%;()&+]/, /union.*select/i, /drop.*table/i, /insert.*into/i, /delete.*from/i]

    if (email && suspiciousPatterns.some((pattern) => pattern.test(email))) {
      errors.email = "Invalid characters in email"
    }

    if (Object.keys(errors).length > 0) {
      return res.status(STATUS.NOT_FOUND).json({
        success: false,
        errors,
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const admin = await User.findOne({
      email: normalizedEmail,
      isAdmin: true,
    }).select("+password")

    if (!admin) {
      return res.status(STATUS.UNAUTHORIZED).json({
        success: false,
        errors: {
          email: ADMIN.INVALID_EMAIL_PASSWORD,
        },
      })
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password)

    if (!isPasswordValid) {
      console.warn(`Failed login attempt for admin: ${normalizedEmail} from IP: ${req.ip}`)

      return res.status(STATUS.UNAUTHORIZED).json({
        success: false,
        errors: {
          email: ADMIN.INVALID_EMAIL_PASSWORD,
        },
      })
    }

    req.session.admin = {
      id: admin._id,
      email: admin.email,
      name: admin.name || "Admin",
      loginTime: new Date(),
    }

    await User.findByIdAndUpdate(admin._id, {
      lastLogin: new Date(),
      $inc: { loginCount: 1 },
    })

    return res.json({
      success: true,
      message: "Login successful",
      redirectTo: "/admin/dashboard",
    })
  } catch (err) {
    console.error("Admin login error:", err)

    return res.status(STATUS.SERVER_ERROR).json({
      success: false,
      errors: {
        general: "An error occurred during login. Please try again.",
      },
    })
  }
}

const loadDashboard = async (req, res,next) => {
    if (!req.session.admin) {
        return res.redirect('/admin/login');
    }
    try {
        res.render('layout',{body:'dashboard'});
    } catch (err) {
        next(err);
    }
};

const logout = async(req,res,next)=>{
    try{
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying session",err);
                return res.redirect('/pageerror');
            }
            res.redirect('/admin/login');
        })
    }catch(err){
        next(err);
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
}