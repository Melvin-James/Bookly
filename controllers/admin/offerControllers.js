const Product = require('../../models/productSchema');

const setProductOffer = async(req,res)=>{
    try{
        const{id}=req.params;
        const{offer}=req.body;

        await Product.findByIdAndUpdate(id,{
            productOffer:parseFloat(offer)
        });

        res.redirect('/admin/products?offerUpdated=true');
    }catch(err){
        console.error('Error setting product offer:',err);
        res.status(500).send('Something went wrong');
    }
};

module.exports = {
    setProductOffer,
}