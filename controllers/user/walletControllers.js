const User = require("../../models/userSchema");

const getWalletPage = async(req,res)=>{
    try{
        const userId = req.session.user._id;
        const user = await User.findById(userId);

        res.render('userLayout',{
            body:'wallet',
            userData:req.session.user,
            walletBalance:user.wallet || 0,
        });
    }catch(error){
        console.error('Failed to load wallet page:',error);
        res.status(500).render('error:',{message:'Cannot load wallet at the moment'});
    }
}

module.exports={
    getWalletPage,
}