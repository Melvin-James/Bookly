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

const downloadSalesReportPDF = async (req, res, next) => {
  try {
    const { filter, from, to } = req.query;
    const query = getFilterQuery(filter, from, to);
    const orders = await Order.find(query).populate('user');

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Bookly - Sales Report', { align: 'center' });
    doc.moveDown();

 
    const tableTop = 100;
    const itemHeight = 25;
    const colWidths = [40, 120, 100, 80, 80, 100];
    const colX = [30, 70, 190, 290, 370, 450];    


    doc.font('Helvetica-Bold').fontSize(12);
    const headers = ['#', 'Order ID', 'Customer', 'Amount', 'Discount', 'Date'];
    headers.forEach((header, i) => {
      doc.rect(colX[i], tableTop, colWidths[i], itemHeight).stroke();
      doc.text(header, colX[i] + 5, tableTop + 7, { width: colWidths[i] - 10 });
    });

    let y = tableTop + itemHeight;
    doc.font('Helvetica').fontSize(10);

    orders.forEach((order, i) => {
      const values = [
        i + 1,
        order.orderId || 'N/A',
        order.user?.name || 'N/A',
        `₹${order.totalAmount}`,
        `₹${order.discountAmount || 0}`,
        order.createdAt.toDateString()
      ];

      values.forEach((text, j) => {
        doc.rect(colX[j], y, colWidths[j], itemHeight).stroke();
        doc.text(String(text), colX[j] + 5, y + 7, { width: colWidths[j] - 10 });
      });

      y += itemHeight;

      if (y > doc.page.height - 50) {
        doc.addPage();
        y = tableTop;
      }
    });

    doc.end();
  } catch (err) {
    next(err);
  }
};

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