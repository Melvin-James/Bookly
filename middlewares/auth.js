const User = require('../models/userSchema');

const userAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/user/login');
    }
    next();
};

const adminAuth = (req,res,next)=>{
    // User.findOne({isAdmin:true})
    // .then(data=>{
    //     if(data){
    //         next();
    //     }else{
    //         res.redirect('/admin/login')
    //     }
    // })
    // .catch(error=>{
    //     console.log('Error in adminauth middleware',error);
    //     res.status(500).send('internal server error')
    // })
    if (!req.session.admin) {
        return res.redirect('/admin/login');
    }
    next();
}


module.exports={
    userAuth,
    adminAuth
}