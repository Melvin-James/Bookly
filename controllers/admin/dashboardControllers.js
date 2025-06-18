const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');

const getDashboardStas = async (req, res, next) => {
  try {
    const period = req.query.period || 'month';

    const now = new Date();
    const currentStart = new Date(now);
    const previousStart = new Date(now);

    if (period === 'today') {
      currentStart.setHours(0, 0, 0, 0);
      previousStart.setDate(currentStart.getDate() - 1);
      previousStart.setHours(0, 0, 0, 0);
    }
    else if (period === 'week') {
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

    const isValidOrder = (order) => {
      const { paymentMethod, status } = order;
      if (['Cancelled', 'Returned', 'Failed'].includes(status)) return false;
      if (paymentMethod === 'Online' && ['Placed', 'Delivered'].includes(status)) return true;
      if (paymentMethod === 'COD' && status === 'Delivered') return true;
      return false;
    };

    const currentOrders = orders.filter(o => isValidOrder(o) && o.createdAt >= currentStart);
    const previousOrders = orders.filter(o => isValidOrder(o) && o.createdAt < currentStart);

    const sumRevenue = (ordersList) =>
      ordersList.reduce((sum, o) => sum + o.totalAmount, 0);

    const sumProducts = (ordersList) =>
      ordersList.reduce((sum, o) =>
        sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

    const totalRevenue = sumRevenue(currentOrders);
    const prevRevenue = sumRevenue(previousOrders);

    const totalOrders = currentOrders.length;
    const prevOrders = previousOrders.length;

    const productsSold = sumProducts(currentOrders);
    const prevProductsSold = sumProducts(previousOrders);

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

const getTopProducts = async (req,res,next)=>{
    try{
        const orders = await Order.find().populate('items.product');

        const validOrders = orders.filter(order=>{
            const {paymentMethod, status} = order;
            if(['Cancelled','Returned','Failed'].includes(status)) return false;
            if(paymentMethod === 'Online' && ['Placed','Delivered'].includes(status)) return true;
            if(paymentMethod === 'COD' && status === 'Delivered') return true;
            return false;
        })
        const productMap = new Map();

        validOrders.forEach(order=>{
            order.items.forEach(item=>{
                const id = item.product._id.toString();
                if(!productMap.has(id)){
                    productMap.set(id,{
                        name:item.product.name,
                        sales:0,
                        revenue:0
                    });
                }
                const p = productMap.get(id);
                p.sales += item.quantity;
                p.revenue += item.quantity * (item.discountedPrice || item.originalPrice);
            });
        });

        const sorted = [...productMap.values()].sort((a,b)=>b.sales - a.sales);
        res.json(sorted.slice(0,10));
    }catch(err){
        next(err);
    }
}

const getTopCategories = async (req,res,next)=>{
    try{
        const orders = await Order.find().populate('items.product');

        const validOrders = orders.filter(order=>{
            const {paymentMethod, status} = order;
            if(['Cancelled', 'Returned', 'Failed'].includes(status)) return false;
            if(paymentMethod === 'Online' && ['Placed','Delivered'].includes(status)) return true;
            if(paymentMethod === 'COD' && status === 'Delivered') return true;
            return false;
        })
        const catMap = new Map();

        for(const order of validOrders){
            for(const item of order.items){
                const prod = item.product;
                const catId = prod.category.toString();
                if(!catMap.has(catId)){
                    const cat = await Category.findById(catId);
                    catMap.set(catId,{
                        name:cat.name,
                        sales: 0,
                        revenue:0
                    });
                }
                const c = catMap.get(catId);
                c.sales += item.quantity;
                c.revenue += item.quantity * (item.discountedPrice || item.originalPrice);
            }
        }
        const sorted = [...catMap.values()].sort((a,b)=>b.sales - a.sales);
        res.json(sorted.slice(0,10));
    }catch(err){
        next(err);
    }
}

const getSalesChart = async (req, res, next) => {
  try {
    const period = parseInt(req.query.period || 30);
    const since = new Date();
    since.setDate(since.getDate() - period);

    const orders = await Order.find({ createdAt: { $gte: since } });

    const validOrders = orders.filter(order => {
      const { paymentMethod, status } = order;
      if (['Cancelled', 'Returned', 'Failed'].includes(status)) return false;
      if (paymentMethod === 'Online' && ['Placed', 'Delivered'].includes(status)) return true;
      if (paymentMethod === 'COD' && status === 'Delivered') return true;
      return false;
    });

    const chartData = {};
    for (let i = 0; i < period; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString('en-GB');
      chartData[key] = { revenue: 0, orders: 0 };
    }

    validOrders.forEach(order => {
      const key = new Date(order.createdAt).toLocaleDateString('en-GB');
      if (chartData[key]) {
        chartData[key].revenue += order.totalAmount;
        chartData[key].orders += 1;
      }
    });

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
    const orders = await Order.aggregate([
      { $unwind: "$items" },

      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },

      {
        $group: {
          _id: "$productInfo.publisher",
          totalSold: { $sum: "$items.quantity" }
        }
      },


      { $sort: { totalSold: -1 } },

      { $limit: 10 }
    ]);

    res.json({ publishers: orders });
  } catch (err) {
    next(err);
  }
};


module.exports={
    getDashboardStas,
    getTopProducts,
    getTopCategories,
    getSalesChart,
    getTopPublishers
}