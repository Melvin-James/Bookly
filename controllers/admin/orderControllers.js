const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');

const getAdminOrders = async (req, res,next) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 }) 
      .populate('user', 'name email'); 

    res.render('layout', {
      body:'orders',
      orders,
      adminData: req.session.admin
    });
  } catch (err) {
    next(err);
  }
};

const searchOrder = async (req,res,next)=>{
  try{
    const query = req.query.query;
    const orders = await Order.find({
      orderId : {$regex:query, $options:'i'}
    })

    res.json({success:true, orders});
  }catch(err){
    next(err)
  }
}

const getPaginatedOrder = async (req,res,next)=>{
  try{
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page-1) * limit;
    const query = req.query.query || '';

    const filter = query
      ?{orderId : {$regex : query, $options: 'i'}}
      :{};

    const orders = await Order.find(filter)
      .populate('user')
      .sort({createdAt:-1})
      .skip(skip)
      .limit(limit);
    
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders/limit);

    res.json({
      success: true,
      orders,
      currentPage: page,
      totalPages
    });
  }catch(err){
    next(err);
  }
};

const getAdminOrderDetails = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate('items.product').populate('user');

    if (!order) {
      return res.status(404).render('error', { message: 'Order not found!' });
    }

    const statusUpdated = req.query.statusUpdated === 'true';
    const returnStatus = req.query.returnStatus || null;

    res.render('layout',{
      body:'adminOrderDetails',
      admin: req.session.admin,
      order,
      statusUpdated,
      returnStatus,
    });

  } catch (err) {
    next(err);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const { status } = req.body;

    const allowedStatuses = ['Placed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status selected.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (['Delivered', 'Returned', 'Cancelled', 'Failed'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot modify an order that is already ${order.status}.` });
    }

      for(let item of order.items){
        if(item.status === 'Cancelled'){
          item.status = 'Cancelled';
        }
        else{
          item.status = status
        }
      }
      
      const statusCount = {};

      order.items.forEach(item => {
        const status = item.status;
        statusCount[status] = (statusCount[status] || 0) + 1;
      });

      let mostFrequentStatus = '';
      let maxCount = 0;

      for (const status in statusCount) {
        if (statusCount[status] > maxCount) {
          mostFrequentStatus = status;
          maxCount = statusCount[status];
        }
      }

      order.status = mostFrequentStatus;
      await order.save();

      return res.status(200).json({ message: 'Order status updated.' });


  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const approveReturnRequest = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);

    if (!order || !order.isReturnRequested || order.isReturnApproved) {
      return res.status(400).json({ success: false, message: 'Invalid return request.' });
    }

    const user = await User.findById(order.user);

    let refundAmount = 0;
    for (const item of order.items) {
      if (item.status !== 'Cancelled') {
        refundAmount += item.discountedPrice * item.quantity;
      }
    }
    user.wallet = (user.wallet || 0) + refundAmount;


    const walletTransaction = {
      type: "credit",
      amount: refundAmount,
      description: `Return approved for order ${order.orderId}`,
      orderId: order.orderId 
    };
    user.walletTransactions.push(walletTransaction);

    await user.save();

    for (let item of order.items) {
      if(item.status === 'Cancelled'){
        item.status = 'Cancelled';
      }
      else{
        item.status = 'Returned'
        await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
      }
    }

    order.isReturnApproved = true;
    order.status = 'Returned';
    await order.save();

    res.redirect(`/admin/orders/${orderId}?returnStatus=approved`);
    
  } catch (err) {
    next(err)
  }
};

const rejectReturnRequest = async (req, res,next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);

    if (!order || !order.isReturnRequested || order.isReturnApproved) {
      return res.status(400).json({ success: false, message: 'Invalid return request.' });
    }

    order.isReturnRequested = false;
    order.returnReason = null;
    await order.save();

    res.redirect(`/admin/orders/${orderId}?returnStatus=rejected`);
  } catch (error) {
    next(err);
  }
};

module.exports = {
  getAdminOrders,
  getAdminOrderDetails,
  updateOrderStatus,
  approveReturnRequest,
  rejectReturnRequest,
  getPaginatedOrder,
  searchOrder,
};