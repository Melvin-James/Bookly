const path = require('path');
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD
  }
});

const signupStep1 = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    if (!name || !email || !phone || !password || password !== confirmPassword) {
      return res.status(400).json({ errors: { general: 'Please fill all fields correctly.' } });
    }

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) return res.status(409).json({ errors: { email: 'Email or Phone already exists' } });

    const hashedPassword = await bcrypt.hash(password, 10);
    if (!req.file) {
      return res.status(400).json({ errors: { userImage: 'Profile image is required.' } });
    }
    
    req.session.tempUser = {
      name,
      email,
      phone,
      password: hashedPassword,
      userImage: req.file.filename
    };

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ errors: { general: 'Server error occurred.' } });
  }
};

const signupStep2 = async (req, res) => {
  const { addressType, recipientName, city, state, landmark, pincode, addressPhone, altPhone } = req.body;

  if (!addressType || !recipientName || !city || !state || !landmark || !pincode || !addressPhone) {
    return res.status(400).json({ errors: { general: 'All address fields are required.' } });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('otp for signup:',otp);
  req.session.tempUser.address = {
    addressType,
    name: recipientName,
    city,
    state,
    landmark,
    pincode,
    phone: addressPhone,
    altPhone
  };
  req.session.tempUser.otp = otp;
  req.session.tempUser.otpExpires = Date.now() + 60 * 1000;

  const mailOptions = {
    from: process.env.NODEMAILER_EMAIL,
    to: req.session.tempUser.email,
    subject: 'Your Bookly OTP Code',
    text: `Your OTP code is ${otp}. It is valid for 1 minute.`
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.json({ success: true });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ errors: { general: 'Failed to send OTP. Try again later.' } });
  }
};

const verifyOtp = async (req, res) => {
  const { otp } = req.body;
  const { tempUser } = req.session;

  if (!tempUser || tempUser.otp !== otp || Date.now() > tempUser.otpExpires) {
    return res.status(400).json({ error: 'Invalid or expired OTP.' });
  }

  try {
    const user = await User.create({
      name: tempUser.name,
      email: tempUser.email,
      phone: tempUser.phone,
      password: tempUser.password,
      userImage: [tempUser.userImage]
    });

    await Address.create({
      userId: user._id,
      address: [tempUser.address]
    });

    req.session.tempUser = null;
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed.' });
  }
};

const loadSignup = (req, res) => {
  try {
    res.render('signup');
  } catch (error) {
    console.error('Error loading signup page:', error);
    res.status(500).render('error', { message: 'Failed to load signup page' });
  }
};

const resendOtp = async (req, res) => {
  try {
    const tempUser = req.session.tempUser;
    if (!tempUser) {
      return res.status(400).json({
        error: "Session expired.Please start over.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 5 * 60 * 1000;

    req.session.tempUser.otp = otp;
    req.session.tempUser.otpExpires = otpExpires;

    await sendVerificationEmail(tempUser.email, otp);

    return res.json({
      success: true,
      message: "New OTP sent to your email",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      error: "Failed to resend OTP. please try again.",
    });
  }
};

const pageNotFound = async (req, res) => {
  try {
    res.render("pageNotFound");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const homePage = async (req, res) => {
  try {
    const products = await Product.find({ isBlocked: false }).sort({
      createdAt: -1,
    }).limit(4);
    const user = await User.findById(req.session.user._id);
    res.render("homePage", { products,userData:user });
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { message: "Server Error" });
  }
};

const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("login", { errors: {}, formData: {} });
    } else {
      return res.redirect("/user/home");
    }
  } catch (error) {
    console.error("Login Page Error:", error);
    return res.redirect("/pageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    let errors = {};

    if (!email) {
      errors.email = { msg: "Email is required" };
    }

    if (!password) {
      errors.password = { msg: "Password is required" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      errors.email = { msg: "Invalid email format" };
    }

    if (Object.keys(errors).length > 0) {
      return res.render("login", { errors, formData: { email } });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.render("login", {
        errors: { login: { msg: "Invalid email or password" } },
        formData: { email },
      });
    }

    if (user.isBlocked) {
      return res.render("login", {
        errors: {
          login: { msg: "Your account has been blocked by the admin." },
        },
        formData: { email },
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("login", {
        errors: { login: { msg: "Invalid email or password" } },
        formData: { email },
      });
    }

    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      userImage: user.userImage,
    };

    return res.redirect("/user/home");
  } catch (error) {
    console.error("Login Error:", error);
    return res.render("login", {
      errors: { login: { msg: "Something went wrong, try again!" } },
      formData: { email },
    });
  }
};

const loadForgotPassword = async (req, res) => {
  res.render("forgot-password", { errors: {} });
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    let errors = {};

    if (!email) {
      errors.email = "Email is required";
    }

    const user = await User.findOne({ email });
    if (!user) {
      errors.email = "User is not registered";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      errors.email = "Invalid email format";
    }

    if (Object.keys(errors).length > 0) {
      return res.json({ errors });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store token in session (instead of database)
    req.session.resetToken = resetToken;
    req.session.resetEmail = email;
    req.session.resetTokenExpiration = Date.now() + 3600000; // Token valid for 1 hour

    // Send reset email
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const resetLink = `http://localhost:3000/user/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Password Reset Request - Bookly",
      html: `<p>You requested a password reset. Click the link below to reset your password:</p>
                   <a href="${resetLink}">${resetLink}</a>
                   <p>If you did not request this, please ignore this email.</p>`,
    };

    await transporter.sendMail(mailOptions);

    return res.json({ success: true, redirectTo: "/user/forgot-password" });
  } catch (error) {
    console.error("forgot-password error:", error);
    res.status(500).json({ error: "An error occured. please try again." });
  }
};

const loadResetPassword = async (req, res) => {
  const { token } = req.query;
  console.log("From loadResetPassword controller:", token);
  if (
    !req.session.resetToken ||
    req.session.resetToken !== token ||
    Date.now() > req.session.resetTokenExpiration
  ) {
    return res.render("reset-password", {
      errors: { token: "Invalid or expired token" },
      email: "",
    });
  }
  res.render("reset-password", { errors: {}, email: req.session.resetEmail });
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    let errors = {};

    // Validate session
    if (!req.session.resetEmail) {
      return res.redirect("/user/forgot-password");
    }

    const email = req.session.resetEmail;

    // Validate passwords
    if (!newPassword || newPassword.length < 6) {
      errors.newPassword = "Password must be at least 6 characters";
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      return res.render("reset-password", { errors, email });
    }

    // Find user and update password
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("reset-password", {
        errors: { email: "User not found" },
        email,
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Clear session data after successful password reset
    req.session.resetToken = undefined;
    req.session.resetEmail = undefined;
    req.session.resetTokenExpiration = undefined;

    res.redirect("/user/login");
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.render("reset-password", {
      errors: { newPassword: "Something went wrong, try again!" },
      email: "",
    });
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.redirect("/user/login");
  });
};

module.exports = {
  loadSignup,
  signupStep1,
  signupStep2,
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
};
