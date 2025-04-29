const User = require('../models/userSchema');

const userAuth =async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/user/login');
    }
    next();
};

const adminAuth = (req,res,next)=>{
    if (!req.session.admin) {
        return res.redirect('/admin/login');
    }
    next();
}


module.exports={
    userAuth,
    adminAuth
}