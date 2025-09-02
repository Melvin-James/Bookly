const Order = require('../../models/orderSchema');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const getFilterQuery = require('../../utils/salesFilter');

const getSalesReport = async (req, res, next) => {
  try {
    const { filter, from, to } = req.query;
    let query = {};

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

    const orders = await Order.find(query).sort({ createdAt: -1 });

    let deliveredItems = [];
    let totalSalesAmount = 0;
    let totalDiscount = 0;

    for (let order of orders) {
      const orderSubtotal = order.items.reduce(
        (sum, item) => sum + (item.discountedPrice || 0) * item.quantity,
        0
      );

      for (let item of order.items) {
        if (item.status === "Delivered") {
          const itemRevenue = (item.discountedPrice || 0) * item.quantity;

          let couponShare = 0;
          if (order.couponDiscount > 0 && orderSubtotal > 0) {
            couponShare = (itemRevenue / orderSubtotal) * order.couponDiscount;
          }

          const netRevenue = itemRevenue - couponShare;

          deliveredItems.push({
            ...item.toObject(),
            orderId: order.orderId,
            createdAt: order.createdAt,
            couponApplied: order.couponApplied,
            couponShare,
            netRevenue,
          });

          totalSalesAmount += netRevenue;

          const productDiscount =
            ((item.originalPrice || 0) - (item.discountedPrice || 0)) * item.quantity;
          totalDiscount += productDiscount + couponShare;
        }
      }
    }

    const totalSalesCount = deliveredItems.length;

    res.render("layout", {
      body: "salesReport",
      orders: deliveredItems, 
      stats: {
        totalSalesCount,
        totalSalesAmount,
        totalDiscount,
      },
      filter,
      from,
      to,
    });
  } catch (err) {
    next(err);
  }
};

const getPaginatedSale = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const { filter, from, to } = req.query;

    let query = {};
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

    const orders = await Order.find(query).populate("user").sort({ createdAt: -1 });

    let deliveredItems = [];

    for (let order of orders) {
      const orderSubtotal = order.items.reduce(
        (sum, it) => sum + (it.discountedPrice || 0) * it.quantity,
        0
      );

      for (let item of order.items) {
        if (item.status === "Delivered") {
          const itemRevenue = (item.discountedPrice || 0) * item.quantity;

          let couponShare = 0;
          if (order.couponDiscount > 0 && orderSubtotal > 0) {
            couponShare = (itemRevenue / orderSubtotal) * order.couponDiscount;
          }

          const netRevenue = itemRevenue - couponShare;

          deliveredItems.push({
            ...item.toObject(),
            orderId: order.orderId,
            createdAt: order.createdAt,
            user: order.user,
            couponApplied: order.couponApplied,
            couponShare,
            netRevenue,
          });
        }
      }
    }

    const totalDeliveredItems = deliveredItems.length;
    const totalPages = Math.ceil(totalDeliveredItems / limit);
    const paginatedItems = deliveredItems.slice(skip, skip + limit);

    res.json({
      success: true,
      items: paginatedItems,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
};


const downloadSalesReportPDF = async (req, res, next) => {
  try {
    const { filter, from, to } = req.query;
    const query = getFilterQuery(filter, from, to);

    const orders = await Order.find(query).populate("user");

    let deliveredItems = [];
    for (let order of orders) {
      const orderSubtotal = order.items.reduce(
        (sum, it) => sum + (it.discountedPrice || 0) * it.quantity,
        0
      );

      for (let item of order.items) {
        if (item.status === "Delivered") {
          const itemRevenue = (item.discountedPrice || 0) * item.quantity;
          let couponShare = 0;
          if (order.couponDiscount > 0 && orderSubtotal > 0) {
            couponShare = (itemRevenue / orderSubtotal) * order.couponDiscount;
          }
          const netRevenue = itemRevenue - couponShare;

          deliveredItems.push({
            ...item.toObject(),
            orderId: order.orderId,
            user: order.user,
            createdAt: order.createdAt,
            couponShare,
            netRevenue,
          });
        }
      }
    }

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader("Content-Disposition", 'attachment; filename="sales-report.pdf"');
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    doc.fontSize(18).text("Bookly - Sales Report", { align: "center" });
    doc.moveDown();

    const tableTop = 100;
    const itemHeight = 25;
    const colWidths = [40, 80, 100, 100, 100, 100];
    const colX = [30, 70, 150, 250, 350, 450];

    doc.font("Helvetica-Bold").fontSize(12);
    const headers = ["#", "Order ID", "Product", "Customer", "Net Revenue", "Date"];
    headers.forEach((header, i) => {
      doc.rect(colX[i], tableTop, colWidths[i], itemHeight).stroke();
      doc.text(header, colX[i] + 5, tableTop + 7, { width: colWidths[i] - 10 });
    });

    let y = tableTop + itemHeight;
    doc.font("Helvetica").fontSize(10);

    deliveredItems.forEach((item, i) => {
      const values = [
        i + 1,
        item.orderId || "N/A",
        item.productName || "N/A",
        item.user?.name || "N/A",
        `₹${item.netRevenue.toFixed(2)}`,
        item.createdAt.toDateString(),
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


const downloadSalesReportExcel = async (req, res, next) => {
  try {
    const { filter, from, to } = req.query;
    const query = getFilterQuery(filter, from, to);

    const orders = await Order.find(query).populate("user");

    let deliveredItems = [];
    for (let order of orders) {
      const orderSubtotal = order.items.reduce(
        (sum, it) => sum + (it.discountedPrice || 0) * it.quantity,
        0
      );

      for (let item of order.items) {
        if (item.status === "Delivered") {
          const itemRevenue = (item.discountedPrice || 0) * item.quantity;
          let couponShare = 0;
          if (order.couponDiscount > 0 && orderSubtotal > 0) {
            couponShare = (itemRevenue / orderSubtotal) * order.couponDiscount;
          }
          const netRevenue = itemRevenue - couponShare;

          deliveredItems.push({
            ...item.toObject(),
            orderId: order.orderId,
            user: order.user,
            createdAt: order.createdAt,
            couponShare,
            netRevenue,
          });
        }
      }
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales Report");

    sheet.columns = [
      { header: "Order ID", key: "orderId", width: 15 },
      { header: "Product", key: "productName", width: 25 },
      { header: "Customer", key: "userName", width: 20 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Net Revenue", key: "netRevenue", width: 15 },
      { header: "Date", key: "orderDate", width: 20 },
    ];

    deliveredItems.forEach((item) => {
      sheet.addRow({
        orderId: item.orderId,
        productName: item.productName,
        userName: item.user?.name || "N/A",
        quantity: item.quantity,
        netRevenue: item.netRevenue.toFixed(2),
        orderDate: item.createdAt.toDateString(),
      });
    });

    res.setHeader("Content-Disposition", 'attachment; filename="Sales-report.xlsx"');
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};


module.exports={
    getSalesReport,
    downloadSalesReportPDF,
    downloadSalesReportExcel,
    getPaginatedSale,
};