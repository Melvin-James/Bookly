const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');

const getAdminOrders = async (req, res) => {
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

const getAdminOrderDetails = async (req, res) => {
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

const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { status } = req.body;

    const allowedStatuses = ['Placed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).render('error', { message: 'Invalid order status selected.' });
    }

    const order = await Order.findById(orderId);

    for(let item of order.items){
      item.status=status;
    }
    if (!order) {
      return res.status(404).render('error', { message: 'Order not found.' });
    }

   if (order.status === 'Delivered' || order.status === 'Returned' || order.status === 'Cancelled' || order.status === 'Failed'){
    return res.status(400).render('error', { message: `Cannot modify an order that is already ${order.status}.` });
   }

    order.status = status;
    await order.save();

    res.redirect(`/admin/orders/${orderId}?statusUpdated=true`);
    
  } catch (err) {
    next(err);
  }
};

const approveReturnRequest = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);

    if (!order || !order.isReturnRequested || order.isReturnApproved) {
      return res.status(400).json({ success: false, message: 'Invalid return request.' });
    }

    const user = await User.findById(order.user);

    const refundAmount = order.totalAmount;
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
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
      item.status = 'Returned';
    }

    order.isReturnApproved = true;
    order.status = 'Returned';
    await order.save();

    res.redirect(`/admin/orders/${orderId}?returnStatus=approved`);
    
  } catch (err) {
    next(err)
  }
};


const rejectReturnRequest = async (req, res) => {
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
};