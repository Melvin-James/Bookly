const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
    try{
        const users = await User.find().sort({createdAt:-1});
        res.render('layout', {body:'customers',users});

    } catch (error) {
        console.error("Error in customerInfo:", error);
        res.status(500).render('error', { message: "Failed to load customer data" });
    }
};

const toggleBlockStatusCustomer = async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false });
  
      user.isBlocked = !user.isBlocked;
      await user.save();
  
      res.json({ success: true, isBlocked: user.isBlocked });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
};

const searchCustomers = async(req,res)=>{
    try{
      const query = req.query.query || '';
      const users = await User.find({
        $or:[
          {name:{$regex:query, $options:'i'}},
          {email:{$regex:query, $options:'i'}}
        ]
      }).sort({createdAt:-1});
      res.json({users});
    }catch(error){
      console.error('Search error:',error);
      res.status(500).json({error:'Internal server Error'});

    }
};

const getPaginatedUsers = async (req, res) => {
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
  } catch (error) {
    console.error('Pagination error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports ={
    customerInfo,
    toggleBlockStatusCustomer,
    searchCustomers,
    getPaginatedUsers,
}