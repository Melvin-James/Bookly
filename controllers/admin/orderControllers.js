const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');

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
  } catch (error) {
    console.error('Admin Orders Fetch Error:', error);
    res.status(500).render('error', { message: 'Failed to load admin orders' });
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

    res.render('layout',{
      body:'adminOrderDetails',
      admin: req.session.admin,
      order,
      statusUpdated,
    });

  } catch (error) {
    console.error('Error loading Admin Order Details:', error);
    res.status(500).render('error', { message: 'Failed to load order details.' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { status } = req.body;

    const allowedStatuses = ['Placed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).render('error', { message: 'Invalid order status selected.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).render('error', { message: 'Order not found.' });
    }

    order.status = status;
    await order.save();

    res.redirect(`/admin/orders/${orderId}?statusUpdated=true`);

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).render('error', { message: 'Failed to update order status.' });
  }
};

module.exports = {
  getAdminOrders,
  getAdminOrderDetails,
  updateOrderStatus,
};
