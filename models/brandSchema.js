const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Brand name is required"],
        trim: true,
        unique: true
    },
    logo: {
        url: { type: String, required: false }, // Optional logo image URL
        public_id: { type: String, required: false } // Useful if using Cloudinary
    },
    isDeleted: {
        type: Boolean,
        default: false // Soft delete functionality
    }
}, { timestamps: true });

module.exports = mongoose.model("Brand", brandSchema);
