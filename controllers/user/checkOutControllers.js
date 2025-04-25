const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');

const getCheckoutPage = async(req,res)=>{
    try{
        const userId = req.session.user._id;
        const user = await User.findById(userId).populate('cart.product');
        const addressDoc = await Address.findOne({userId});

        const cartItems = user.cart;
        let cartTotal = 0;
        cartItems.forEach(item=>{
            cartTotal += item.product.price * item.quantity;
        });

        res.render('checkout',{
            userData:req.session.user,
            cartItems,
            cartTotal,
            addresses:addressDoc?.address || []
        });
    }catch(error){
        console.error('checkout page error:',error);
        res.status(500).render('error',{message:'Failed to load checkout page'});
    }
};

const postCheckout = async (req,res)=>{
    try{
        const userId = req.session.user._id;
        const {selectedAddress, paymentMethod} = req.body;

        const user = await User.findById(userId).populate('cart.product');
        const addressDoc = await Address.findOne({userId});
        const address = addressDoc?.address[selectedAddress];

        if(!address){
            return res.status(400).send('invalid address selection');
        }

        const items = user.cart.map(item=>({
            product:item.product._id,
            quantity: item.quantity
        }));

        const totalAmount = user.cart.reduce((acc,item)=>{
            return acc + item.product.price * item.quantity;
        },0);

        const newOrder = new Order({
            user: userId,
            items,
            address,
            paymentMethod,
            totalAmount,
            status:'Placed'
        });

        await newOrder.save();

        user.cart = [];
        await user.save();

        res.redirect('/order-success');
    }catch(error){
        console.error('Order placement error:',error);
        res.status(500).render('error',{message:'Failed to place order.'});
    }
};

module.exports={
    getCheckoutPage,
    postCheckout,
}