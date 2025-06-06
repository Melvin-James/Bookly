const Order = require('../../models/orderSchema');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const getFilterQuery = require('../../utils/salesFilter');

const getSalesReport = async(req,res,next)=>{
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
    }catch(err){
        next(err);
    }
};


const getPaginatedSale = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const { filter, from, to } = req.query;

    let query = { status: 'Delivered' };

    const today = new Date();
    let startDate, endDate;

    if (filter === 'daily') {
      startDate = new Date(today.setHours(0, 0, 0, 0));
      endDate = new Date(today.setHours(23, 59, 59, 999));
    } else if (filter === 'weekly') {
      const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      startDate = new Date(firstDayOfWeek.setHours(0, 0, 0, 0));
      endDate = new Date();
    } else if (filter === 'monthly') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date();
    } else if (filter === 'custom' && from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    }

    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    res.json({
      success: true,
      orders,
      currentPage: page,
      totalPages
    });
  } catch (err) {
    next(err);
  }
};


const downloadSalesReportPDF = async(req,res,next)=>{
    try{
        const {filter,from,to} = req.query;
        const query = getFilterQuery(filter,from,to);
        const orders = await Order.find(query).populate('user');

        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');
        res.setHeader('Content-Type','application/pdf');
        doc.pipe(res);

        doc.fontSize(20).text('Bookly-Sales Report', {align:'center'});
        doc.moveDown();

        orders.forEach((order,i)=>{
            doc.fontSize(12).text(`${i+1}. Order ID: ${order.orderId}`);
            doc.text(`User:${order.user?.name || 'N/A'}`);
            doc.text(`Amount: ₹${order.totalAmount}`);
            doc.text(`Discount: ₹${order.discountAmount || 0}`);
            doc.text(`Date: ${order.createdAt.toDateString()}`);
            doc.moveDown();
        });

        doc.end();
    }catch(err){
        next(err)
    }
}

const downloadSalesReportExcel = async(req,res,next)=>{
    try{
        const {filter,from,to}=req.query;
        const query = getFilterQuery(filter,from,to);
        const orders = await Order.find(query).populate('user');

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Sales Report');

        sheet.columns = [
            {header:'Order ID', key:'orderId', width:20},
            {header:'User Name', key:'userName', width:25},
            {header:'Total Amount', key:'totalAmount', width:15},
            {header:'Discount', key:'discount', width:15},
            {header:'Order Date', key:'orderdate', width:20}
        ];

        orders.forEach(order=>{
            sheet.addRow({
                orderId: order.orderId,
                userName:order.user?.name || 'N/A',
                totalAmount:order.totalAmount,
                discount:order.discountAmount || 0,
                orderDate: order.createdAt.toDateString()
            });
        });

        res.setHeader('Content-Disposition', 'attachment; filename="Sales-report.xlsx"');
        res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        await workbook.xlsx.write(res);
        res.end();
    }catch(error){
        next(err);
    }
}

module.exports={
    getSalesReport,
    downloadSalesReportPDF,
    downloadSalesReportExcel,
    getPaginatedSale,
};