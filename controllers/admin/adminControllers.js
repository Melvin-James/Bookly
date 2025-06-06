const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { createStructParentTreeNextKey } = require('pdfkit');

const pageerror = async(req,res)=>{
    res.render('pageerror');
}

const loadLogin = (req,res,next)=>{
    try {
        if (!req.session.admin) {
            return res.render('admin-login', { errors: {}, formData: {} });
        } else {
            return res.redirect('/admin/dashboard'); 
        }
    }catch (err) {
        next(err)
    }
}

const login = async (req, res,next) => {
    try {
        const {email,password} = req.body;
        let errors = {};

        if (!email) errors.email = "Email is required";
        if (!password) errors.password = "Password is required";
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            errors.email = "Invalid email format";
        }

        if (password && password.length < 6) {
            errors.password = "Password must be at least 6 characters";
        }

        if (Object.keys(errors).length > 0) {
            return res.json({ errors });
        }

        const admin = await User.findOne({email,isAdmin:true});
        if(!admin){
            console.error('Invalid email or password');
            return res.json({errors:{email:"Invalid email or password"}});
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            console.error('Invalid email or password');
            return res.json({errors:{email:"Invalid email or password"}});
        }

        req.session.admin = { id: admin._id, email: admin.email };

        return res.json({success:true, redirectTo:"/admin/dashboard"});


    }catch(err){
        next(err);
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