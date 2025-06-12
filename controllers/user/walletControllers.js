const User = require("../../models/userSchema");

const getWalletPage = async(req,res,next)=>{
    try{
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        const sortedTransactions = user.walletTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));


        res.render('userLayout',{
            body:'wallet',
            userData:req.session.user,
            walletBalance:user.wallet || 0,
            walletTransactions : sortedTransactions,
        });
    }catch(err){
        next(err);
    }
}

module.exports={
    getWalletPage,
}