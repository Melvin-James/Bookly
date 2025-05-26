const Order = require('../../models/orderSchema');

const getSalesReport = async(req,res)=>{
    try{
        const {filter,from,to}=req.query;
        let query = {status:'Delivered'};

        const today = new Date();
        let startDate, endDate;

        if(filter === 'daily'){
            startDate = new Date(today.setHours(0,0,0,0));
            endDate = new Date(today.setHours(23,59,59,999));
        }else if(filter === 'weekly'){
            const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
            startDate = new Date(firstDayOfWeek.setHours(0,0,0,0));
            endDate = new Date();
        }else if(filter === 'monthly'){
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date();
        }else if(filter === 'custom' && from && to){
            startDate = new Date(from);
            endDate = new Date(to);
            endDate.setHours(23,59,59,999);
        }

        if(startDate && endDate){
            query.createdAt = {$gte: startDate, $lte:endDate};
        }
        const deliveredOrders = await Order.find(query).sort({createdAt:-1});

        const totalSalesCount = deliveredOrders.length;
        const totalSalesAmount = deliveredOrders.reduce((sum,order)=>sum + order.totalAmount, 0);
        const totalDiscount = deliveredOrders.reduce((sum,order)=>sum + (order.discountAmount || 0),0);

        res.render('layout',{body:'salesReport',
            orders:deliveredOrders,
            stats:{
                totalSalesCount,
                totalSalesAmount,
                totalDiscount
            },
            filter,
            from,
            to
        });
    }catch(error){
        console.error('Error generating filtered sales report:',error);
        res.status(500).render('error',{message:'Failed to filter sales report.'});
    }
};


module.exports={
    getSalesReport,
};