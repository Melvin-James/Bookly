const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

const getCartPage = async(req,res)=>{
    try{
        const userId = req.session.user._id;
        const user = await User.findById(userId).populate('cart.product');

        const cartItems = user.cart;
        let cartTotal =0;

        cartItems.forEach(item=>{
            cartTotal +=item.product.price * item.quantity;
        });

        res.render('cart',
            {userData:req.session.user,
            cartItems,
            cartTotal}
        );
    }catch(error){
        console.error('Error loading cart:',error);
        res.status(500).render('error',{message:'Unable to load cart'});
    }
};

const addToCart = async (req,res)=>{
    try{
        const userId = req.session.user._id;
        const productId = req.params.productId;

        const user = await User.findById(userId);

        const itemIndex = user.cart.findIndex(item=>item.product.toString()===productId);

        if(itemIndex > -1){
            user.cart[itemIndex].quantity +=1;
        }else{
            user.cart.push({product:productId, quantity:1});
        }

        await user.save();
        res.redirect('/user/cart');
    }catch(error){
        res.status(500).render('error',{message:'Failed to add item to cart'})
    }
};

const updateCartQuantity = async (req,res)=>{
    try{
        const userId = req.session.user._id;
        const productId = req.params.productId;
        const {action}=req.body;

        const user = await User.findById(userId);

        const item = user.cart.find(item=>item.product.toString()===productId);
        if(!item) return res.redirect('/user/cart');

        if(action === 'increase'){
            item.quantity+=1;
        }else if(action ==='decrease' && item.quantity > 1){
            item.quantity -=1;
        }

        await user.save();
        res.redirect('/user/cart');
    }catch(error){
        console.error('Error updating quantity:',error);
        res.status(500).render('error',{message:'Failed to update quantity'});
    }
}

const removeFromCart = async(req,res)=>{
    try{
        const userId = req.session.user._id;
        const productId = req.params.productId;

        await User.findByIdAndUpdate(userId,{
            $pull:{
                cart:{product:productId}
            }
        });
        res.redirect('/user/cart')
    }catch(error){
        console.error('Error removing from cart:',error);
        res.status(500).render('error',{message:'Failed to remove item'});
    }
};

module.exports ={
    getCartPage,
    addToCart,
    updateCartQuantity,
    removeFromCart,
}