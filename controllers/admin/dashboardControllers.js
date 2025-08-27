const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');

const getDashboardStats = async (req, res, next) => {
  try {
    const period = req.query.period || 'month';

    const now = new Date();
    const currentStart = new Date(now);
    const previousStart = new Date(now);

    if (period === 'today') {
      currentStart.setHours(0, 0, 0, 0);
      previousStart.setDate(currentStart.getDate() - 1);
      previousStart.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      currentStart.setDate(currentStart.getDate() - 7);
      previousStart.setDate(previousStart.getDate() - 14);
    } else if (period === 'month') {
      currentStart.setMonth(currentStart.getMonth() - 1);
      previousStart.setMonth(previousStart.getMonth() - 2);
    } else if (period === 'year') {
      currentStart.setFullYear(currentStart.getFullYear() - 1);
      previousStart.setFullYear(previousStart.getFullYear() - 2);
    } else {
      currentStart.setDate(currentStart.getDate() - 1);
      previousStart.setDate(previousStart.getDate() - 2);
    }

    const orders = await Order.find({
      createdAt: { $gte: previousStart }
    });

    const isValidItem = (order, item) => {
      if (['Cancelled', 'Returned', 'Failed'].includes(item.status)) return false;
      if (order.paymentMethod === 'Online' && ['Placed', 'Delivered'].includes(item.status)) return true;
      if (order.paymentMethod === 'COD' && item.status === 'Delivered') return true;
      return false;
    };

    const allItems = [];
    for (const order of orders) {
      for (const item of order.items) {
        if (isValidItem(order, item)) {
          allItems.push({
            ...item.toObject(),
            createdAt: order.createdAt,
            paymentMethod: order.paymentMethod,
          });
        }
      }
    }

    const currentItems = allItems.filter(i => i.createdAt >= currentStart);
    const previousItems = allItems.filter(i => i.createdAt < currentStart);

    const sumRevenue = (items) =>
      items.reduce((sum, i) => sum + (i.discountedPrice || i.originalPrice || 0) * i.quantity, 0);

    const sumProducts = (items) =>
      items.reduce((sum, i) => sum + i.quantity, 0);

    const totalRevenue = sumRevenue(currentItems);
    const prevRevenue = sumRevenue(previousItems);

    const totalOrders = new Set(currentItems.map(i => i._id.toString())).size;
    const prevOrders = new Set(previousItems.map(i => i._id.toString())).size;

    const productsSold = sumProducts(currentItems);
    const prevProductsSold = sumProducts(previousItems);

    const percentChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev * 100).toFixed(1);
    };

    res.json({
      totalRevenue,
      revenueChange: +percentChange(totalRevenue, prevRevenue),
      totalOrders,
      ordersChange: +percentChange(totalOrders, prevOrders),
      productsSold,
      productsChange: +percentChange(productsSold, prevProductsSold)
    });

  } catch (err) {
    next(err);
  }
};

const getTopProducts = async (req, res, next) => {
  try {
    const orders = await Order.find().populate('items.product');

    const productMap = new Map();

    for (const order of orders) {
      for (const item of order.items) {
        const valid =
          (order.paymentMethod === 'Online' && ['Placed', 'Delivered'].includes(item.status)) ||
          (order.paymentMethod === 'COD' && item.status === 'Delivered');

        if (!valid) continue;

        const id = item.product._id.toString();
        if (!productMap.has(id)) {
          productMap.set(id, {
            name: item.product.name,
            sales: 0,
            revenue: 0
          });
        }

        const p = productMap.get(id);
        p.sales += item.quantity;
        p.revenue += item.quantity * (item.discountedPrice || item.originalPrice);
      }
    }

    const sorted = [...productMap.values()].sort((a, b) => b.sales - a.sales);
    res.json(sorted.slice(0, 10));
  } catch (err) {
    next(err);
  }
};

const getTopCategories = async (req, res, next) => {
  try {
    const orders = await Order.find().populate('items.product');

    const catMap = new Map();

    for (const order of orders) {
      for (const item of order.items) {
        const valid =
          (order.paymentMethod === 'Online' && ['Placed', 'Delivered'].includes(item.status)) ||
          (order.paymentMethod === 'COD' && item.status === 'Delivered');

        if (!valid) continue;

        const prod = item.product;
        const catId = prod.category.toString();

        if (!catMap.has(catId)) {
          const cat = await Category.findById(catId);
          catMap.set(catId, {
            name: cat.name,
            sales: 0,
            revenue: 0
          });
        }

        const c = catMap.get(catId);
        c.sales += item.quantity;
        c.revenue += item.quantity * (item.discountedPrice || item.originalPrice);
      }
    }

    const sorted = [...catMap.values()].sort((a, b) => b.sales - a.sales);
    res.json(sorted.slice(0, 10));
  } catch (err) {
    next(err);
  }
};

const getSalesChart = async (req, res, next) => {
  try {
    const period = parseInt(req.query.period || 30);
    const since = new Date();
    since.setDate(since.getDate() - period);

    const orders = await Order.find({ createdAt: { $gte: since } });

    const chartData = {};
    for (let i = 0; i < period; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString('en-GB');
      chartData[key] = { revenue: 0, orders: 0 };
    }

    for (const order of orders) {
      for (const item of order.items) {
        const valid =
          (order.paymentMethod === 'Online' && ['Placed', 'Delivered'].includes(item.status)) ||
          (order.paymentMethod === 'COD' && item.status === 'Delivered');

        if (!valid) continue;

        const key = new Date(order.createdAt).toLocaleDateString('en-GB');
        if (chartData[key]) {
          chartData[key].revenue += (item.discountedPrice || item.originalPrice) * item.quantity;
          chartData[key].orders += 1; // count per valid item
        }
      }
    }

    const labels = Object.keys(chartData).reverse();
    const revenue = labels.map(l => chartData[l].revenue);
    const ordersCount = labels.map(l => chartData[l].orders);

    res.json({ labels, revenue, orders: ordersCount });
  } catch (err) {
    next(err);
  }
};

const getTopPublishers = async (req, res, next) => {
  try {
    const orders = await Order.find().populate('items.product');

    const publisherMap = new Map();

    for (const order of orders) {
      for (const item of order.items) {
        const valid =
          (order.paymentMethod === 'Online' && ['Placed', 'Delivered'].includes(item.status)) ||
          (order.paymentMethod === 'COD' && item.status === 'Delivered');

        if (!valid) continue;

        const publisher = item.product.publisher?.toString() || "Unknown";
        if (!publisherMap.has(publisher)) {
          publisherMap.set(publisher, { publisher, totalSold: 0 });
        }
        publisherMap.get(publisher).totalSold += item.quantity;
      }
    }

    const sorted = [...publisherMap.values()].sort((a, b) => b.totalSold - a.totalSold);
    res.json({ publishers: sorted.slice(0, 10) });
  } catch (err) {
    next(err);
  }
};


module.exports={
    getDashboardStats,
    getTopProducts,
    getTopCategories,
    getSalesChart,
    getTopPublishers
}