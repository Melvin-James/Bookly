const User = require('../../models/userSchema');
const STATUS = require('../../config/statusCodes');
const{CUSTOMER}=require('../../config/messages');

const customerInfo = async (req, res,next) => {
    try{
        const users = await User.find().sort({createdAt:-1});
        res.render('layout', {body:'customers',users});

    } catch (error) {
        next(err);
    }
};

const toggleBlockStatusCustomer = async (req, res,next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(STATUS.NOT_FOUND).json({ success: false });
  
      user.isBlocked = !user.isBlocked;
      await user.save();
  
      res.json({ success: true, isBlocked: user.isBlocked });
    } catch (err) {
      next(err);
    }
};

const searchCustomers = async(req,res,next)=>{
    try{
      const query = req.query.query || '';
      const users = await User.find({
        $or:[
          {name:{$regex:query, $options:'i'}},
          {email:{$regex:query, $options:'i'}}
        ]
      }).sort({createdAt:-1});
      res.json({users});
    }catch(err){
      next(err);
    }
};

const getPaginatedUsers = async (req, res,next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const query = req.query.query || '';

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    });

    const totalPages = Math.ceil(totalUsers / limit);

    res.json({ users, totalPages, currentPage: page });
  } catch (err) {
    next(err);
  }
};

module.exports ={
    customerInfo,
    toggleBlockStatusCustomer,
    searchCustomers,
    getPaginatedUsers,
}