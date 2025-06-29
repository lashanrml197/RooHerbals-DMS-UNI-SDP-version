const db = require("../config/db");

// Get dashboard stats for reports landing page
const getDashboardStats = async (req, res) => {
  try {
    // Get current date
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Format start of month for SQL query
    const startOfMonth = `${currentYear}-${currentMonth
      .toString()
      .padStart(2, "0")}-01`;

    // Get total sales amount for current month
    const [totalSales] = await db.query(
      `
      SELECT COALESCE(SUM(total_amount), 0) as total_sales 
      FROM orders 
      WHERE MONTH(order_date) = ? AND YEAR(order_date) = ? 
      AND status != 'cancelled'
    `,
      [currentMonth, currentYear]
    );

    // Get total orders count for current month
    const [totalOrders] = await db.query(
      `
      SELECT COUNT(*) as total_orders 
      FROM orders 
      WHERE MONTH(order_date) = ? AND YEAR(order_date) = ? 
      AND status != 'cancelled'
    `,
      [currentMonth, currentYear]
    );

    // Get new customers this month
    const [newCustomers] = await db.query(
      `
      SELECT COUNT(*) as total 
      FROM customers 
      WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
    `,
      [currentMonth, currentYear]
    );

    // Get top selling products
    const [topProducts] = await db.query(
      `
      SELECT p.product_id, p.name, COALESCE(SUM(oi.quantity), 0) as total_quantity, 
      COALESCE(SUM(oi.total_price), 0) as total_sales
      FROM products p
      LEFT JOIN order_items oi ON p.product_id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.order_id
      WHERE MONTH(o.order_date) = ? AND YEAR(o.order_date) = ?
      AND o.status != 'cancelled'
      GROUP BY p.product_id
      ORDER BY total_sales DESC
      LIMIT 5
    `,
      [currentMonth, currentYear]
    );

    // Get previous month data for comparison
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }

    // Get previous month's sales for top product
    let topProductChange = 0;
    if (topProducts.length > 0) {
      const [prevTopProductSales] = await db.query(
        `
        SELECT COALESCE(SUM(oi.total_price), 0) as prev_sales
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.order_id
        WHERE oi.product_id = ?
        AND MONTH(o.order_date) = ? AND YEAR(o.order_date) = ?
        AND o.status != 'cancelled'
      `,
        [topProducts[0].product_id, prevMonth, prevYear]
      );

      // Calculate percentage change
      if (prevTopProductSales[0].prev_sales > 0) {
        topProductChange = Math.round(
          ((topProducts[0].total_sales - prevTopProductSales[0].prev_sales) /
            prevTopProductSales[0].prev_sales) *
            100
        );
      } else {
        topProductChange = 100; // If previous sales were 0, then 100% increase
      }
    }

    // Get sales by area
    const [salesByArea] = await db.query(
      `
      SELECT c.area, COALESCE(SUM(o.total_amount), 0) as area_sales
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE MONTH(o.order_date) = ? AND YEAR(o.order_date) = ?
      AND o.status != 'cancelled'
      GROUP BY c.area
      ORDER BY area_sales DESC
    `,
      [currentMonth, currentYear]
    );

    // Get previous month sales for weakest performing area
    let worstPerformingArea = null;
    let worstAreaChange = 0;

    if (salesByArea.length > 0) {
      // Get the area with lowest sales
      worstPerformingArea = salesByArea[salesByArea.length - 1];

      // Get previous month's sales for this area
      const [prevAreaSales] = await db.query(
        `
        SELECT COALESCE(SUM(o.total_amount), 0) as prev_area_sales
        FROM orders o
        JOIN customers c ON o.customer_id = c.customer_id
        WHERE c.area = ?
        AND MONTH(o.order_date) = ? AND YEAR(o.order_date) = ?
        AND o.status != 'cancelled'
      `,
        [worstPerformingArea.area, prevMonth, prevYear]
      );

      // Calculate percentage change
      if (prevAreaSales[0].prev_area_sales > 0) {
        worstAreaChange = Math.round(
          ((worstPerformingArea.area_sales - prevAreaSales[0].prev_area_sales) /
            prevAreaSales[0].prev_area_sales) *
            100
        );
      }
    }
    res.json({
      totalSales: parseFloat(totalSales[0].total_sales || 0),
      totalOrders: parseInt(totalOrders[0].total_orders || 0),
      newCustomers: parseInt(newCustomers[0].total || 0),
      topSellingProduct:
        topProducts.length > 0
          ? {
              name: topProducts[0].name,
              sales: parseFloat(topProducts[0].total_sales || 0),
              change: parseFloat(topProductChange || 0),
            }
          : null,
      worstPerformingArea: worstPerformingArea
        ? {
            name: worstPerformingArea.area,
            sales: parseFloat(worstPerformingArea.area_sales || 0),
            change: parseFloat(worstAreaChange || 0),
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      message: "Error fetching dashboard stats",
      error: error.message,
    });
  }
};

// Get sales reports data
const getSalesReports = async (req, res) => {
  try {
    // Get query parameters
    const { startDate, endDate, salesRepId, productId, area } = req.query;

    // Default to current month if no dates provided
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const defaultStartDate = `${currentYear}-${currentMonth
      .toString()
      .padStart(2, "0")}-01`;
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const defaultEndDate = `${currentYear}-${currentMonth
      .toString()
      .padStart(2, "0")}-${lastDay}`;

    // Build WHERE clauses based on filters
    let whereClause = "o.status != 'cancelled'";
    let params = [];

    if (startDate && endDate) {
      whereClause += " AND o.order_date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    } else {
      whereClause += " AND o.order_date BETWEEN ? AND ?";
      params.push(defaultStartDate, defaultEndDate);
    }

    if (salesRepId) {
      whereClause += " AND o.sales_rep_id = ?";
      params.push(salesRepId);
    }

    if (area) {
      whereClause += " AND c.area = ?";
      params.push(area);
    }

    // Get sales by date
    const [salesByDate] = await db.query(
      `
      SELECT 
        DATE(o.order_date) as date,
        COALESCE(SUM(o.total_amount), 0) as total_sales,
        COUNT(o.order_id) as order_count
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE ${whereClause}
      GROUP BY DATE(o.order_date)
      ORDER BY date
      `,
      params
    );

    // Get sales by product
    let productWhereClause = whereClause;
    let productParams = [...params];

    if (productId) {
      productWhereClause += " AND p.product_id = ?";
      productParams.push(productId);
    }

    const [salesByProduct] = await db.query(
      `
      SELECT
        p.product_id,
        p.name,
        COALESCE(SUM(oi.quantity), 0) as total_quantity,
        COALESCE(SUM(oi.total_price), 0) as total_sales
      FROM products p
      LEFT JOIN order_items oi ON p.product_id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.order_id
      LEFT JOIN customers c ON o.customer_id = c.customer_id
      WHERE ${productWhereClause}
      GROUP BY p.product_id
      ORDER BY total_sales DESC
      LIMIT 10
      `,
      productParams
    );

    // Get sales by sales representative
    const [salesByRep] = await db.query(
      `
      SELECT
        u.user_id,
        u.full_name,
        COUNT(DISTINCT o.order_id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales
      FROM users u
      LEFT JOIN orders o ON u.user_id = o.sales_rep_id
      LEFT JOIN customers c ON o.customer_id = c.customer_id
      WHERE u.role = 'sales_rep' AND ${whereClause}
      GROUP BY u.user_id
      ORDER BY total_sales DESC
      `,
      params
    );

    // Get sales by payment type
    const [salesByPaymentType] = await db.query(
      `
      SELECT
        o.payment_type,
        COUNT(o.order_id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE ${whereClause}
      GROUP BY o.payment_type
      ORDER BY total_sales DESC
      `,
      params
    ); // Process results to ensure all numeric values are proper numbers
    const processSalesData = (data) => {
      return data.map((item) => {
        const result = { ...item };
        // Convert numeric string values to actual numbers
        if (result.total_sales !== undefined) {
          result.total_sales = parseFloat(result.total_sales || 0);
        }
        if (result.order_count !== undefined) {
          result.order_count = parseInt(result.order_count || 0);
        }
        if (result.total_quantity !== undefined) {
          result.total_quantity = parseInt(result.total_quantity || 0);
        }
        return result;
      });
    };

    res.json({
      salesByDate: processSalesData(salesByDate),
      salesByProduct: processSalesData(salesByProduct),
      salesByRep: processSalesData(salesByRep),
      salesByPaymentType: processSalesData(salesByPaymentType),
    });
  } catch (error) {
    console.error("Error fetching sales reports:", error);
    res.status(500).json({
      message: "Error fetching sales reports",
      error: error.message,
    });
  }
};

// Get inventory reports data
const getInventoryReports = async (req, res) => {
  try {
    // Get current date
    const now = new Date();

    // Get low stock products
    const [lowStockProducts] = await db.query(
      `
      SELECT
        p.product_id,
        p.name,
        p.reorder_level,
        COALESCE(SUM(pb.current_quantity), 0) as total_stock
      FROM products p
      LEFT JOIN product_batches pb ON p.product_id = pb.product_id
      WHERE pb.is_active = 1
      GROUP BY p.product_id
      HAVING total_stock <= p.reorder_level
      ORDER BY (total_stock / p.reorder_level) ASC
      LIMIT 10
      `
    );

    // Get expiring batches (within next 30 days)
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(now.getDate() + 30);

    const [expiringBatches] = await db.query(
      `
      SELECT
        pb.batch_id,
        pb.batch_number,
        p.name as product_name,
        pb.expiry_date,
        pb.current_quantity
      FROM product_batches pb
      JOIN products p ON pb.product_id = p.product_id
      WHERE pb.expiry_date BETWEEN ? AND ?
      AND pb.current_quantity > 0
      AND pb.is_active = 1
      ORDER BY pb.expiry_date ASC
      `,
      [
        now.toISOString().split("T")[0],
        thirtyDaysLater.toISOString().split("T")[0],
      ]
    ); // Get stock value by category
    const [stockByCategory] = await db.query(
      `
      SELECT
        c.name as category,
        COALESCE(SUM(pb.current_quantity * pb.cost_price), 0) as stock_value,
        COUNT(DISTINCT p.product_id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.category_id = p.category_id
      LEFT JOIN product_batches pb ON p.product_id = pb.product_id
      WHERE pb.is_active = 1
      GROUP BY c.category_id
      ORDER BY stock_value DESC
      `
    );

    // Get top moving products (last 30 days)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [topMovingProducts] = await db.query(
      `
      SELECT
        p.product_id,
        p.name,
        COALESCE(SUM(oi.quantity), 0) as quantity_sold
      FROM products p
      LEFT JOIN order_items oi ON p.product_id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.order_id
      WHERE o.order_date >= ?
      AND o.status != 'cancelled'
      GROUP BY p.product_id
      ORDER BY quantity_sold DESC
      LIMIT 5
      `,
      [thirtyDaysAgo.toISOString()]
    );

    // Get slow moving products (last 30 days)
    const [slowMovingProducts] = await db.query(
      `
      SELECT
        p.product_id,
        p.name,
        COALESCE(SUM(oi.quantity), 0) as quantity_sold
      FROM products p
      LEFT JOIN order_items oi ON p.product_id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.order_id
      WHERE p.is_active = 1
      AND (o.order_date >= ? OR o.order_date IS NULL)
      AND (o.status != 'cancelled' OR o.status IS NULL)
      GROUP BY p.product_id
      ORDER BY quantity_sold ASC
      LIMIT 5
      `,
      [thirtyDaysAgo.toISOString()]
    ); // Get total products count for percentage calculations
    const [totalProductsCount] = await db.query(
      `
      SELECT
        COUNT(DISTINCT p.product_id) as total
      FROM products p
      WHERE p.is_active = 1
      `
    );

    // Process numeric values to ensure consistency
    lowStockProducts.forEach((product) => {
      product.total_stock = parseFloat(product.total_stock);
      product.reorder_level = parseFloat(product.reorder_level);
    });

    expiringBatches.forEach((batch) => {
      batch.current_quantity = parseInt(batch.current_quantity);
    });

    stockByCategory.forEach((category) => {
      category.stock_value = parseFloat(category.stock_value);
      category.product_count = parseInt(category.product_count);
    });

    topMovingProducts.forEach((product) => {
      product.quantity_sold = parseInt(product.quantity_sold);
    });

    slowMovingProducts.forEach((product) => {
      product.quantity_sold = parseInt(product.quantity_sold);
    });

    res.json({
      lowStockProducts,
      expiringBatches,
      stockByCategory,
      topMovingProducts,
      slowMovingProducts,
      totalProductsCount: parseInt(totalProductsCount[0].total),
    });
  } catch (error) {
    console.error("Error fetching inventory reports:", error);
    res.status(500).json({
      message: "Error fetching inventory reports",
      error: error.message,
    });
  }
};

// Get customer reports data
const getCustomerReports = async (req, res) => {
  try {
    // Get top customers by total spent
    const [topCustomers] = await db.query(
      `
      SELECT
        c.customer_id,
        c.name,
        c.area,
        COUNT(o.order_id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM customers c
      LEFT JOIN orders o ON c.customer_id = o.customer_id
      WHERE o.status != 'cancelled'
      GROUP BY c.customer_id
      ORDER BY total_spent DESC
      LIMIT 10
      `
    );

    // Get customers with credit balance
    const [creditCustomers] = await db.query(
      `
      SELECT
        c.customer_id,
        c.name,
        c.credit_balance,
        c.credit_limit,
        CASE 
          WHEN c.credit_limit > 0 THEN ROUND((c.credit_balance / c.credit_limit) * 100, 2)
          ELSE 0
        END as credit_usage_percent
      FROM customers c
      WHERE c.credit_balance > 0 AND c.is_active = 1
      ORDER BY credit_usage_percent DESC
      LIMIT 10
      `
    );

    // Get customer acquisition over time (last 12 months)
    const [customerAcquisition] = await db.query(
      `
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as new_customers
      FROM customers
      WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month
      `
    );

    // Get sales by area
    const [salesByArea] = await db.query(
      `
      SELECT
        c.area,
        COUNT(DISTINCT c.customer_id) as customer_count,
        COUNT(DISTINCT o.order_id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales
      FROM customers c
      LEFT JOIN orders o ON c.customer_id = o.customer_id
      WHERE o.status != 'cancelled'
      GROUP BY c.area
      ORDER BY total_sales DESC
      `
    );

    res.json({
      topCustomers,
      creditCustomers,
      customerAcquisition,
      salesByArea,
    });
  } catch (error) {
    console.error("Error fetching customer reports:", error);
    res.status(500).json({
      message: "Error fetching customer reports",
      error: error.message,
    });
  }
};

// Get commission reports data
const getCommissionReports = async (req, res) => {
  try {
    // Get query parameters
    const { month, year } = req.query;

    // Default to current month if not provided
    const now = new Date();
    const currentMonth = month || now.getMonth() + 1;
    const currentYear = year || now.getFullYear();

    // Get sales rep commissions
    const [repCommissions] = await db.query(
      `
      SELECT
        u.user_id,
        u.full_name,
        u.commission_rate,
        COALESCE(SUM(o.total_amount), 0) as total_sales,
        ROUND(COALESCE(SUM(o.total_amount), 0) * (u.commission_rate / 100), 2) as commission_amount
      FROM users u
      LEFT JOIN orders o ON u.user_id = o.sales_rep_id AND MONTH(o.order_date) = ? AND YEAR(o.order_date) = ?
      WHERE u.role = 'sales_rep' AND u.is_active = 1 AND (o.status != 'cancelled' OR o.status IS NULL)
      GROUP BY u.user_id
      ORDER BY commission_amount DESC
      `,
      [currentMonth, currentYear]
    );

    // Get commission history for last 4 months
    const [commissionHistory] = await db.query(
      `
      SELECT
        MONTH(o.order_date) as month,
        YEAR(o.order_date) as year,
        COUNT(DISTINCT o.sales_rep_id) as rep_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales,
        ROUND(COALESCE(SUM(o.total_amount * (u.commission_rate / 100)), 0), 2) as total_commission,
        ROUND(AVG(u.commission_rate), 2) as avg_commission_rate
      FROM orders o
      JOIN users u ON o.sales_rep_id = u.user_id
      WHERE o.order_date >= DATE_SUB(LAST_DAY(DATE_SUB(CURRENT_DATE(), INTERVAL 4 MONTH)), INTERVAL DAY(LAST_DAY(DATE_SUB(CURRENT_DATE(), INTERVAL 4 MONTH)))-1 DAY)
      AND o.status != 'cancelled'
      GROUP BY YEAR(o.order_date), MONTH(o.order_date)
      ORDER BY YEAR(o.order_date) DESC, MONTH(o.order_date) DESC
      LIMIT 4
      `
    );

    res.json({
      repCommissions,
      commissionHistory,
    });
  } catch (error) {
    console.error("Error fetching commission reports:", error);
    res.status(500).json({
      message: "Error fetching commission reports",
      error: error.message,
    });
  }
};

// Generate daily sales report
const getDailySalesReport = async (req, res) => {
  try {
    // Get date from query or use current date if not provided
    const { date } = req.query;
    const reportDate = date || new Date().toISOString().split("T")[0];

    // Get daily sales summary
    const [dailySummary] = await db.query(
      `
      SELECT
        DATE(o.order_date) as report_date,
        COUNT(o.order_id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_sales,
        COALESCE(SUM(o.discount_amount), 0) as total_discounts
      FROM orders o
      WHERE DATE(o.order_date) = ? AND o.status != 'cancelled'
      GROUP BY DATE(o.order_date)
      `,
      [reportDate]
    );

    // Get sales by payment type
    const [paymentBreakdown] = await db.query(
      `
      SELECT
        o.payment_type,
        COUNT(o.order_id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as amount
      FROM orders o
      WHERE DATE(o.order_date) = ? AND o.status != 'cancelled'
      GROUP BY o.payment_type
      `,
      [reportDate]
    );

    // Get sales by sales rep
    const [salesRepBreakdown] = await db.query(
      `
      SELECT
        u.full_name as sales_rep,
        COUNT(o.order_id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales
      FROM orders o
      JOIN users u ON o.sales_rep_id = u.user_id
      WHERE DATE(o.order_date) = ? AND o.status != 'cancelled'
      GROUP BY o.sales_rep_id
      ORDER BY total_sales DESC
      `,
      [reportDate]
    );

    // Get sales by product
    const [productBreakdown] = await db.query(
      `
      SELECT
        p.name as product_name,
        COALESCE(SUM(oi.quantity), 0) as quantity_sold,
        COALESCE(SUM(oi.total_price), 0) as total_sales
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE DATE(o.order_date) = ? AND o.status != 'cancelled'
      GROUP BY oi.product_id
      ORDER BY quantity_sold DESC
      `,
      [reportDate]
    );

    // Get orders detail
    const [orderDetails] = await db.query(
      `
      SELECT
        o.order_id,
        c.name as customer_name,
        c.area,
        o.order_date,
        o.total_amount,
        o.discount_amount,
        o.payment_type,
        o.payment_status,
        o.status
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE DATE(o.order_date) = ? AND o.status != 'cancelled'
      ORDER BY o.order_date
      `,
      [reportDate]
    );

    res.json({
      reportDate,
      summary: dailySummary[0] || {
        report_date: reportDate,
        total_orders: 0,
        total_sales: 0,
        total_discounts: 0,
      },
      paymentBreakdown,
      salesRepBreakdown,
      productBreakdown,
      orderDetails,
    });
  } catch (error) {
    console.error("Error generating daily sales report:", error);
    res.status(500).json({
      message: "Error generating daily sales report",
      error: error.message,
    });
  }
};

// Export data
const exportData = async (req, res) => {
  try {
    const { type, format, startDate, endDate } = req.query;

    // Validate required parameters
    if (!type) {
      return res.status(400).json({
        message:
          "Export type is required (customers, orders, inventory, sales)",
      });
    }

    // Default to current month if no dates provided
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const defaultStartDate = `${currentYear}-${currentMonth
      .toString()
      .padStart(2, "0")}-01`;
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const defaultEndDate = `${currentYear}-${currentMonth
      .toString()
      .padStart(2, "0")}-${lastDay}`;

    const exportStartDate = startDate || defaultStartDate;
    const exportEndDate = endDate || defaultEndDate;

    let exportData;

    switch (type) {
      case "customers":
        const [customers] = await db.query(
          `
          SELECT
            c.customer_id,
            c.name,
            c.contact_person,
            c.phone,
            c.email,
            c.address,
            c.city,
            c.area,
            c.credit_limit,
            c.credit_balance,
            DATE_FORMAT(c.created_at, '%Y-%m-%d') as created_at
          FROM customers c
          WHERE c.is_active = 1
          ORDER BY c.name
          `
        );
        exportData = customers;
        break;

      case "orders":
        const [orders] = await db.query(
          `
          SELECT
            o.order_id,
            c.name as customer_name,
            c.area,
            u.full_name as sales_rep,
            DATE_FORMAT(o.order_date, '%Y-%m-%d') as order_date,
            o.total_amount,
            o.discount_amount,
            o.payment_type,
            o.payment_status,
            o.status
          FROM orders o
          JOIN customers c ON o.customer_id = c.customer_id
          JOIN users u ON o.sales_rep_id = u.user_id
          WHERE o.order_date BETWEEN ? AND ?
          ORDER BY o.order_date DESC
          `,
          [exportStartDate, exportEndDate]
        );
        exportData = orders;
        break;

      case "inventory":
        const [inventory] = await db.query(
          `
          SELECT
            p.product_id,
            p.name as product_name,
            c.name as category,
            p.unit_price,
            p.reorder_level,
            COALESCE(SUM(pb.current_quantity), 0) as current_stock,
            CASE 
              WHEN COALESCE(SUM(pb.current_quantity), 0) <= p.reorder_level THEN 'Low Stock'
              ELSE 'In Stock'
            END as stock_status
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.category_id
          LEFT JOIN product_batches pb ON p.product_id = pb.product_id AND pb.is_active = 1
          WHERE p.is_active = 1
          GROUP BY p.product_id
          ORDER BY p.name
          `
        );
        exportData = inventory;
        break;

      case "sales":
        const [sales] = await db.query(
          `
          SELECT
              DATE_FORMAT(o.order_date, '%Y-%m-%d') as date,
              COUNT(o.order_id) as order_count,
              COALESCE(SUM(o.total_amount), 0) as total_sales,
              COALESCE(SUM(o.discount_amount), 0) as total_discounts
          FROM orders o
          WHERE o.order_date BETWEEN ? AND ?
          AND o.status != 'cancelled'
          GROUP BY 
             DATE_FORMAT(o.order_date, '%Y-%m-%d')
          ORDER BY date DESC
          `,
          [exportStartDate, exportEndDate]
        );
        exportData = sales;
        break;

      default:
        return res.status(400).json({
          message:
            "Invalid export type. Must be one of: customers, orders, inventory, sales",
        });
    }

    // For now, we'll just return the data as JSON
    // In a real app, you'd format this as CSV or Excel
    res.json({
      success: true,
      exportType: type,
      dateRange: {
        startDate: exportStartDate,
        endDate: exportEndDate,
      },
      data: exportData,
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    res.status(500).json({
      message: "Error exporting data",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getSalesReports,
  getInventoryReports,
  getCustomerReports,
  getCommissionReports,
  getDailySalesReport,
  exportData,
};
