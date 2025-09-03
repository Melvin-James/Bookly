const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

const getWishlistPage = async(req,res,next)=>{
    try{
        const userId = req.session.user._id;

        const user = await User.findById(userId).populate('wishlist');

        res.render('wishlist',{
            userData:req.session.user,
            wishlistItems:user.wishlist
        });
    }catch(err){
       next(err)
    }
};

const toggleWishlist = async(req,res,next)=>{
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
    }catch(err){
        next(err);
    }
};

const moveToCart = async (req, res,next) => {
    try {
      const userId = req.session.user._id;
      const productId = req.params.productId;
  
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
  
      const alreadyInCart = user.cart.some(item => item.product.toString() === productId);
  
      if (!alreadyInCart) {
        user.cart.push({ product: productId, quantity: 1 });
      }

      user.wishlist.pull(productId);
  
      await user.save();
  
      res.json({ success: true, message: 'Moved to cart' });
  
    } catch (err) {
      next(err);
    }
  };

  const getItemsInWishlistCount = async(req,res,next)=>{
    try{
      if (!req.session || !req.session.user) {
        return res.status(200).json({ success: true, value: 0 });
      }
      const userId = req.session.user._id;
      if (!userId) {
        return res.status(404).json({ success: false, value: 0 });
      }
      const userWishlist = await User.findById(userId).select('wishlist -_id');
      const value = userWishlist?.wishlist?.length || 0;

      return res.status(200).json({ success: true, value });

    }catch(error){
      next(error);
    }
  }

module.exports ={
    getWishlistPage,
    toggleWishlist,
    moveToCart,
    getItemsInWishlistCount
}