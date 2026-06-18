import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required:true
    },
    isListed:{
        type:Boolean,
        default:true
    },
    categoryOffer:{
        type:Number,
    },
},{ timestamps: true });

const category = mongoose.model('category',categorySchema);
export default category;