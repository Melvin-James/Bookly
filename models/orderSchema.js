const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 1
    },
    status: {
      type: String,
      enum: ['Placed', 'Cancelled', 'Returned','Delivered','Out for Delivery','Shipped','Failed'],
    },
    originalPrice: Number,
    discountedPrice: Number,
    productName: String,
    productImage: String,
  }],  
  address: {
    addressType:String,
    name: String,
    city: String,
    state: String,
    pincode: Number,
    landmark: String,
    phone: String,
    altPhone: String
  },
  paymentMethod: {
    type: String,
    enum: ["COD", "Online"],
    default: "COD"
  },
  totalAmount: {type:Number, required: true},
  status: {
    type: String,
    enum: ["Placed", "Shipped", "Delivered", "Cancelled","Out for Delivery","Returned","Failed"],
  },
  returnReason: {
    type: String,
    default: null
  },
  isReturnRequested: {
    type: Boolean,
    default: false
  },
  isReturnApproved: { type: Boolean, default: false },
  couponApplied:{type:String},
  couponDiscount: {
    type: Number,
    default: 0
  },
  productDiscount: {
    type: Number,
    default: 0
  },
  discountAmount:{type:Number, default:0},
}, { timestamps: true });


const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
