const db = require("../config/db");
const bcrypt = require("bcrypt");

/**
 * Get a list of all sales representatives
 */
const getAllSalesReps = async (req, res) => {
  try {
    const [salesReps] = await db.query(
      "SELECT * FROM users WHERE role = 'sales_rep' ORDER BY full_name"
    );

    res.status(200).json(salesReps);
  } catch (error) {
    console.error("Error fetching sales representatives:", error);
    res.status(500).json({
      message: "Error fetching sales representatives",
      error: error.message,
    });
  }
};

/**
 * Get a single sales representative by ID
 */
const getSalesRepById = async (req, res) => {
  try {
    const { id } = req.params;

    const [salesRep] = await db.query(
      "SELECT * FROM users WHERE user_id = ? AND role = 'sales_rep'",
      [id]
    );

    if (salesRep.length === 0) {
      return res
        .status(404)
        .json({ message: "Sales representative not found" });
    }

    res.status(200).json(salesRep[0]);
  } catch (error) {
    console.error("Error fetching sales representative:", error);
    res.status(500).json({
      message: "Error fetching sales representative",
      error: error.message,
    });
  }
};

/**
 * Add a new sales representative
 */
const addSalesRep = async (req, res) => {
  try {
    const {
      username,
      password,
      full_name,
      email,
      phone,
      address,
      area,
      commission_rate,
    } = req.body;

    // Validate required fields
    if (!username || !password || !full_name || !phone || !area) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Check if username already exists
    const [existingUser] = await db.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Generate a new user ID
    const [lastUser] = await db.query(
      "SELECT user_id FROM users ORDER BY user_id DESC LIMIT 1"
    );

    let newUserId;
    if (lastUser.length === 0) {
      newUserId = "U001";
    } else {
      const lastId = lastUser[0].user_id;
      const numericPart = parseInt(lastId.substring(1), 10);
      newUserId = `U${String(numericPart + 1).padStart(3, "0")}`;
    } // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new sales rep
    await db.query(
      `INSERT INTO users (
        user_id, username, password, full_name, role, email, 
        phone, address, area, commission_rate, is_active
      ) VALUES (?, ?, ?, ?, 'sales_rep', ?, ?, ?, ?, ?, 1)`,
      [
        newUserId,
        username,
        hashedPassword, // Stored as hashed password
        full_name,
        email || null,
        phone,
        address || null,
        area,
        commission_rate || 10.0, // Default commission rate if not provided
      ]
    );

    res.status(201).json({
      message: "Sales representative added successfully",
      userId: newUserId,
    });
  } catch (error) {
    console.error("Error adding sales representative:", error);
    res.status(500).json({
      message: "Error adding sales representative",
      error: error.message,
    });
  }
};

/**
 * Update an existing sales representative
 */
const updateSalesRep = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      phone,
      address,
      area,
      commission_rate,
      is_active,
    } = req.body;

    // Check if sales rep exists
    const [salesRep] = await db.query(
      "SELECT * FROM users WHERE user_id = ? AND role = 'sales_rep'",
      [id]
    );

    if (salesRep.length === 0) {
      return res
        .status(404)
        .json({ message: "Sales representative not found" });
    }

    // Update the sales rep
    await db.query(
      `UPDATE users SET 
        full_name = ?,
        email = ?,
        phone = ?,
        address = ?,
        area = ?,
        commission_rate = ?,
        is_active = ?
      WHERE user_id = ?`,
      [
        full_name || salesRep[0].full_name,
        email || salesRep[0].email,
        phone || salesRep[0].phone,
        address || salesRep[0].address,
        area || salesRep[0].area,
        commission_rate || salesRep[0].commission_rate,
        is_active !== undefined ? is_active : salesRep[0].is_active,
        id,
      ]
    );

    res
      .status(200)
      .json({ message: "Sales representative updated successfully" });
  } catch (error) {
    console.error("Error updating sales representative:", error);
    res.status(500).json({
      message: "Error updating sales representative",
      error: error.message,
    });
  }
};

/**
 * Get sales statistics for a sales representative
 */
const getSalesRepStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if sales rep exists
    const [salesRep] = await db.query(
      "SELECT * FROM users WHERE user_id = ? AND role = 'sales_rep'",
      [id]
    );

    if (salesRep.length === 0) {
      return res
        .status(404)
        .json({ message: "Sales representative not found" });
    }

    // Get total number of orders
    const [totalOrders] = await db.query(
      "SELECT COUNT(*) as total FROM orders WHERE sales_rep_id = ?",
      [id]
    );

    // Get total sales amount
    const [totalSales] = await db.query(
      "SELECT SUM(total_amount) as total FROM orders WHERE sales_rep_id = ?",
      [id]
    );

    // Get customer count
    const [customersCount] = await db.query(
      "SELECT COUNT(DISTINCT customer_id) as total FROM orders WHERE sales_rep_id = ?",
      [id]
    );

    // Get recent orders
    const [recentOrders] = await db.query(
      `SELECT o.order_id, o.order_date, o.total_amount, o.status,
        c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE o.sales_rep_id = ?
      ORDER BY o.order_date DESC
      LIMIT 5`,
      [id]
    );

    res.status(200).json({
      salesRep: salesRep[0],
      stats: {
        totalOrders: totalOrders[0].total,
        totalSales: totalSales[0].total || 0,
        customersCount: customersCount[0].total,
        recentOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching sales rep statistics:", error);
    res.status(500).json({
      message: "Error fetching sales rep statistics",
      error: error.message,
    });
  }
};

/**
 * Get all commissions for a sales representative
 */
const getSalesRepCommissions = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if sales rep exists
    const [salesRep] = await db.query(
      "SELECT * FROM users WHERE user_id = ? AND role = 'sales_rep'",
      [id]
    );

    if (salesRep.length === 0) {
      return res
        .status(404)
        .json({ message: "Sales representative not found" });
    }

    // Get all commissions
    const [commissions] = await db.query(
      `SELECT * FROM commissions 
      WHERE sales_rep_id = ? 
      ORDER BY year DESC, month DESC`,
      [id]
    );

    res.status(200).json(commissions);
  } catch (error) {
    console.error("Error fetching sales rep commissions:", error);
    res.status(500).json({
      message: "Error fetching sales rep commissions",
      error: error.message,
    });
  }
};

/**
 * Calculate commission for a specific month/year
 */
const calculateCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    // Check if sales rep exists
    const [salesRep] = await db.query(
      "SELECT * FROM users WHERE user_id = ? AND role = 'sales_rep'",
      [id]
    );

    if (salesRep.length === 0) {
      return res
        .status(404)
        .json({ message: "Sales representative not found" });
    }

    // Check if commission already calculated
    const [existingCommission] = await db.query(
      `SELECT * FROM commissions 
      WHERE sales_rep_id = ? AND month = ? AND year = ?`,
      [id, month, year]
    );

    if (existingCommission.length > 0) {
      return res
        .status(400)
        .json({ message: "Commission already calculated for this period" });
    }

    // Verify it's not a future month and that the month has ended
    const currentDate = new Date();
    const lastDayOfMonth = new Date(year, month, 0).getDate(); // Last day of the month
    const endOfMonthDate = new Date(
      year,
      month - 1,
      lastDayOfMonth,
      23,
      59,
      59
    );

    // If the end of the month being calculated is in the future, prevent calculation
    if (endOfMonthDate > currentDate) {
      return res.status(400).json({
        message: "Commission can only be calculated after the month has ended",
      });
    }

    // Get sales total for the specified month/year
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const [totalSales] = await db.query(
      `SELECT SUM(total_amount) as total 
      FROM orders 
      WHERE sales_rep_id = ? 
      AND order_date >= ? 
      AND order_date < ?
      AND status != 'cancelled'`,
      [id, startDate, endDate]
    );

    const salesAmount = totalSales[0].total || 0;

    // Skip commission calculation if sales amount is 0
    if (salesAmount <= 0) {
      return res.status(400).json({
        message: "No commission to calculate as the sales amount is 0",
      });
    }

    const commissionRate = salesRep[0].commission_rate;
    const commissionAmount = salesAmount * (commissionRate / 100);

    // Generate a new commission ID
    const [lastCommission] = await db.query(
      "SELECT commission_id FROM commissions ORDER BY commission_id DESC LIMIT 1"
    );

    let newCommissionId;
    if (lastCommission.length === 0) {
      newCommissionId = "C001";
    } else {
      const lastId = lastCommission[0].commission_id;
      const numericPart = parseInt(lastId.substring(1), 10);
      newCommissionId = `C${String(numericPart + 1).padStart(3, "0")}`;
    }

    // Insert commission record
    await db.query(
      `INSERT INTO commissions (
        commission_id, sales_rep_id, month, year, total_sales, 
        commission_rate, amount, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'calculated')`,
      [
        newCommissionId,
        id,
        month,
        year,
        salesAmount,
        commissionRate,
        commissionAmount,
      ]
    );

    res.status(201).json({
      message: "Commission calculated successfully",
      commission: {
        id: newCommissionId,
        month,
        year,
        totalSales: salesAmount,
        commissionRate,
        amount: commissionAmount,
        status: "calculated",
      },
    });
  } catch (error) {
    console.error("Error calculating commission:", error);
    res
      .status(500)
      .json({ message: "Error calculating commission", error: error.message });
  }
};

/**
 * Update commission status (approve/pay)
 */
const updateCommissionStatus = async (req, res) => {
  try {
    const { id, commissionId } = req.params;
    const { status, payment_date } = req.body;

    if (!status || !["approved", "paid"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Valid status (approved or paid) is required" });
    }

    // Check if commission exists
    const [commission] = await db.query(
      `SELECT * FROM commissions 
      WHERE commission_id = ? AND sales_rep_id = ?`,
      [commissionId, id]
    );

    if (commission.length === 0) {
      return res.status(404).json({ message: "Commission not found" });
    }

    // Validate status transition
    const currentStatus = commission[0].status;
    if (status === "approved" && currentStatus !== "calculated") {
      return res
        .status(400)
        .json({ message: "Only calculated commissions can be approved" });
    }

    if (status === "paid" && currentStatus !== "approved") {
      return res
        .status(400)
        .json({ message: "Only approved commissions can be paid" });
    }

    // Format date for MySQL - converts ISO dates to MySQL compatible format
    const formatDateForMySQL = (date) => {
      return date.toISOString().slice(0, 19).replace("T", " ");
    };

    // Create properly formatted date or null based on status
    let formattedDate = null;
    if (status === "paid") {
      const dateToUse = payment_date ? new Date(payment_date) : new Date();
      formattedDate = formatDateForMySQL(dateToUse);
    }

    // Update commission status
    await db.query(
      `UPDATE commissions SET 
        status = ?,
        payment_date = ?
      WHERE commission_id = ?`,
      [status, formattedDate, commissionId]
    );

    res.status(200).json({ message: `Commission ${status} successfully` });
  } catch (error) {
    console.error("Error updating commission status:", error);
    res.status(500).json({
      message: "Error updating commission status",
      error: error.message,
    });
  }
};

/**
 * Get sales rep dashboard stats for all sales reps
 */
const getSalesRepDashboardStats = async (req, res) => {
  try {
    // Get total number of sales reps
    const [totalSalesReps] = await db.query(
      "SELECT COUNT(*) as total FROM users WHERE role = 'sales_rep'"
    );

    // Get active sales reps
    const [activeSalesReps] = await db.query(
      "SELECT COUNT(*) as total FROM users WHERE role = 'sales_rep' AND is_active = 1"
    );

    // Get pending commissions (calculated and approved but not paid)
    const [pendingCommissions] = await db.query(
      "SELECT COUNT(*) as total FROM commissions WHERE status IN ('calculated', 'approved')"
    );

    // Get recent activities
    const [recentCommissions] = await db.query(
      `SELECT c.commission_id, c.sales_rep_id, c.amount, c.status, c.payment_date,
        u.full_name
      FROM commissions c
      JOIN users u ON c.sales_rep_id = u.user_id
      ORDER BY c.created_at DESC
      LIMIT 3`
    );

    const [recentOrders] = await db.query(
      `SELECT o.order_id, o.sales_rep_id, o.total_amount, o.order_date,
        u.full_name as sales_rep_name,
        c.name as customer_name
      FROM orders o
      JOIN users u ON o.sales_rep_id = u.user_id
      JOIN customers c ON o.customer_id = c.customer_id
      ORDER BY o.order_date DESC
      LIMIT 3`
    );

    const [newSalesReps] = await db.query(
      `SELECT user_id, full_name, area, created_at
      FROM users
      WHERE role = 'sales_rep'
      ORDER BY created_at DESC
      LIMIT 3`
    );

    // Combine activities
    const recentActivities = [
      ...recentCommissions.map((c) => ({
        activity_type: "Commission Paid",
        title: `Rs. ${c.amount}`,
        subtitle: c.full_name,
        timestamp: c.payment_date || c.created_at,
      })),
      ...recentOrders.map((o) => ({
        activity_type: "New Order Collected",
        title: `Rs. ${o.total_amount}`,
        subtitle: `${o.sales_rep_name} - ${o.customer_name}`,
        timestamp: o.order_date,
      })),
      ...newSalesReps.map((s) => ({
        activity_type: "New Sales Rep Added",
        title: s.full_name,
        subtitle: s.area,
        timestamp: s.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);

    res.status(200).json({
      totalSalesReps: totalSalesReps[0].total,
      activeSalesReps: activeSalesReps[0].total,
      pendingCommissions: pendingCommissions[0].total,
      recentActivities,
    });
  } catch (error) {
    console.error("Error fetching sales rep dashboard stats:", error);
    res.status(500).json({
      message: "Error fetching sales rep dashboard stats",
      error: error.message,
    });
  }
};

/**
 * Get all orders for a sales representative
 */
const getSalesRepAllOrders = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if sales rep exists
    const [salesRep] = await db.query(
      "SELECT * FROM users WHERE user_id = ? AND role = 'sales_rep'",
      [id]
    );

    if (salesRep.length === 0) {
      return res
        .status(404)
        .json({ message: "Sales representative not found" });
    }

    // Get all orders without limit
    const [allOrders] = await db.query(
      `SELECT o.order_id, o.order_date, o.total_amount, o.status,
        c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE o.sales_rep_id = ?
      ORDER BY o.order_date DESC`,
      [id]
    );

    res.status(200).json(allOrders);
  } catch (error) {
    console.error("Error fetching sales rep orders:", error);
    res.status(500).json({
      message: "Error fetching sales rep orders",
      error: error.message,
    });
  }
};

module.exports = {
  getAllSalesReps,
  getSalesRepById,
  addSalesRep,
  updateSalesRep,
  getSalesRepStats,
  getSalesRepCommissions,
  calculateCommission,
  updateCommissionStatus,
  getSalesRepDashboardStats,
  getSalesRepAllOrders,
};
