const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true, default:'0000000000' },
    password: { type: String, required: true },
    wallet: {
      type: Number,
      default: 0
    },
    walletTransactions: [{
      type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      description: {
        type: String,
        required: true
      },
      orderId: {
        type: String
      },
      date: {
        type: Date,
        default: Date.now
      }
    }],
    otp: { type: String },  
    otpExpires: { type: Date, index: { expires: '1m' } },

    googleId: { type: String }, 
    userImage: {type: [String]},
    isBlocked: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },

    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    cart: [{
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, default: 1 }
      }],
      

    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    couponUsage: {
      type: Map,
      of: Number,
      default: {}
    },    
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
module.exports = User;
