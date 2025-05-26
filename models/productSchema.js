const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    publisher: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'category',
        required: true,
    },
    price: {
        type: Number,
        required: true
    },
    productOffer: {
        type: Number,
    },
    quantity: {
        type: Number,
        default: 0
    },
    color: {
        type: String,
        required: true
    },
    productImage: {
        type: [String],
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['Available', 'Out of Stock', 'Discontinued'],
        required: true,
        default: 'Available'
    },
    appliedOffer: {
    type: Number,
    default: 0,
    required: true,
    },
    discountedPrice: {
    type: Number,
    default: 0,
    required: true,
    },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
