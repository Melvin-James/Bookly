const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const rateLimit = require("express-rate-limit")
const { createStructParentTreeNextKey } = require('pdfkit');

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
      errors.email = "Email is required"
    }

    if (!password || typeof password !== "string") {
      errors.password = "Password is required"
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email.trim())) {
      errors.email = "Please enter a valid email address"
    }

    if (password && password.length < 6) {
      errors.password = "Password must be at least 6 characters long"
    }

    if (email && email.trim().length > 254) {
      errors.email = "Email address is too long"
    }

    if (password && password.length > 128) {
      errors.password = "Password is too long"
    }

    const suspiciousPatterns = [/[<>"'%;()&+]/, /union.*select/i, /drop.*table/i, /insert.*into/i, /delete.*from/i]

    if (email && suspiciousPatterns.some((pattern) => pattern.test(email))) {
      errors.email = "Invalid characters in email"
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
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
      return res.status(401).json({
        success: false,
        errors: {
          email: "Invalid email or password",
        },
      })
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password)

    if (!isPasswordValid) {
      console.warn(`Failed login attempt for admin: ${normalizedEmail} from IP: ${req.ip}`)

      return res.status(401).json({
        success: false,
        errors: {
          email: "Invalid email or password",
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

    return res.status(500).json({
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