const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

const getWishlistPage = async(req,res)=>{
    try{
        const userId = req.session.user._id;

        const user = await User.findById(userId).populate('wishlist');

        res.render('wishlist',{
            userData:req.session.user,
            wishlistItems:user.wishlist
        });
    }catch(error){
        console.error('Error loading wishlist:',error);
        res.status(500).render('error',{message:'Failed to load wishlist.'});
    }
};

const toggleWishlist = async(req,res)=>{
    try{
        const userId = req.session.user._id;
        const productId = req.params.productId;

        const user = await User.findById(userId);

        if(!user) return res.status(404).json({success:false, message:'User not found.'});

        const alreadyWishlisted = user.wishlist.includes(productId);

        if(alreadyWishlisted){
            user.wishlist.pull(productId);
            await user.save();
            return res.json({success:true,message:'Removed from wishlist'});
        }else{
            user.wishlist.push(productId);
            await user.save();
            return res.json({success:true, message:'Added to wishlist'});
        }
    }catch(error){
        console.error('Wishlist toggle error:',error);
        res.status(500).json({success:false, message:'Server error'});
    }
};

module.exports ={
    getWishlistPage,
    toggleWishlist,
}