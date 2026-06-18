import User from '../models/userSchema.js';

const userAuth = async (req, res, next) => {
    if (req.user || req.session.user) {
        return next();
    }
    return res.redirect('/user/login');
};

const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        return next();
    }
    return res.redirect('/admin/login');
};

export {
    userAuth,
    adminAuth
};
