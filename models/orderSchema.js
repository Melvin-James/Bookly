const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
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
      required: true
    }
  }],
  address: {
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
  totalAmount: Number,
  status: {
    type: String,
    enum: ["Pending", "Placed", "Shipped", "Delivered", "Cancelled"],
    default: "Placed"
  }
}, { timestamps: true }); // ✅ Auto adds createdAt + updatedAt

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
