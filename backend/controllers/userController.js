const db = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

// User login
const login = async (req, res) => {
  try {
    const { username, password, userType } = req.body;

    // Validate input
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Get user from database
    const [users] = await db.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    // Check if user exists
    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    // Check if user role matches selected role type
    const roleMap = {
      admin: "owner",
      sales: "sales_rep",
      driver: "lorry_driver",
    };

    if (user.role !== roleMap[userType]) {
      return res.status(401).json({ message: "Invalid role" });
    }

    // Compare password using bcrypt
    let passwordIsValid;

    // Check if the password is already hashed (starts with $2b$)
    if (user.password.startsWith("$2b$")) {
      // If hashed, use bcrypt.compare
      passwordIsValid = await bcrypt.compare(password, user.password);
    } else {
      // If not hashed (legacy password), do direct comparison
      passwordIsValid = password === user.password;

      if (passwordIsValid) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query("UPDATE users SET password = ? WHERE user_id = ?", [
          hashedPassword,
          user.user_id,
        ]);
        console.log(`Upgraded password hash for user ${user.username}`);
      }
    }

    if (!passwordIsValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "secret-key-when-fallback",
      { expiresIn: "1d" }
    );

    // Return token and user info
    res.json({
      token,
      user: {
        id: user.user_id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        area: user.area,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await db.query(
      "SELECT user_id, username, full_name, role, email, phone, area, created_at FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    // Get additional stats based on user role
    let stats = {};

    if (user.role === "sales_rep") {
      // Get sales rep stats
      const [salesStats] = await db.query(
        `SELECT 
          COUNT(DISTINCT o.customer_id) as total_customers,
          COUNT(o.order_id) as total_orders,
          SUM(o.total_amount) as total_sales,
          (SELECT commission_rate FROM users WHERE user_id = ?) as commission_rate
        FROM orders o 
        WHERE o.sales_rep_id = ?`,
        [userId, userId]
      );

      stats = {
        totalCustomers: salesStats[0].total_customers || 0,
        totalOrders: salesStats[0].total_orders || 0,
        totalSales: salesStats[0].total_sales || 0,
        commissionRate: salesStats[0].commission_rate || 0,
      };
    } else if (user.role === "lorry_driver") {
      // Get driver stats
      const [driverStats] = await db.query(
        `SELECT 
          COUNT(d.delivery_id) as total_deliveries,
          COUNT(DISTINCT d.order_id) as total_orders,
          COUNT(CASE WHEN d.status = 'completed' THEN 1 END) as completed_deliveries
        FROM deliveries d
        WHERE d.driver_id = ?`,
        [userId]
      );

      stats = {
        totalDeliveries: driverStats[0].total_deliveries || 0,
        totalOrders: driverStats[0].total_orders || 0,
        completedDeliveries: driverStats[0].completed_deliveries || 0,
      };
    }

    res.json({
      id: user.user_id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      area: user.area,
      createdAt: user.created_at,
      stats,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, phone, currentPassword, newPassword } = req.body;

    // If password change is requested, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ message: "Current password is required" });
      }

      // Get current user data
      const [users] = await db.query(
        "SELECT password FROM users WHERE user_id = ?",
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = users[0];

      // Verify current password
      let passwordIsValid;

      if (user.password.startsWith("$2b$")) {
        passwordIsValid = await bcrypt.compare(currentPassword, user.password);
      } else {
        // Legacy plain text password
        passwordIsValid = currentPassword === user.password;
      }

      if (!passwordIsValid) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user with new password
      await db.query(
        "UPDATE users SET password = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
        [hashedPassword, email || null, phone || null, userId]
      );
    } else {
      // Just update profile without password change
      await db.query(
        "UPDATE users SET email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
        [email || null, phone || null, userId]
      );
    }

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get dashboard statistics and recent activities
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get user information
    const [users] = await db.query(
      "SELECT user_id, username, full_name, role FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    // Get current date for querying this month's data
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const formattedFirstDay = firstDayOfMonth.toISOString().split("T")[0];
    const formattedToday = today.toISOString().split("T")[0];

    // Initialize stats object
    let stats = {
      todayOrders: 0,
      todaySales: 0,
      thisMonthOrders: 0,
      thisMonthSales: 0,
    };

    // Fetch today's stats
    const todayStatsQuery = `
      SELECT 
        COUNT(order_id) as today_orders,
        COALESCE(SUM(total_amount), 0) as today_sales
      FROM orders 
      WHERE DATE(order_date) = CURRENT_DATE()
    `;

    // Fetch this month's stats
    const monthStatsQuery = `
      SELECT 
        COUNT(order_id) as month_orders,
        COALESCE(SUM(total_amount), 0) as month_sales
      FROM orders 
      WHERE order_date BETWEEN '${formattedFirstDay}' AND '${formattedToday} 23:59:59'
    `;

    // Add role-specific conditions
    let todayStatsCondition = "";
    let monthStatsCondition = "";

    if (userRole === "sales_rep") {
      todayStatsCondition = ` AND sales_rep_id = '${userId}'`;
      monthStatsCondition = ` AND sales_rep_id = '${userId}'`;
    } else if (userRole === "lorry_driver") {
      // For drivers, count by deliveries instead
      const [driverStats] = await db.query(
        `
        SELECT 
          COUNT(d.delivery_id) as today_deliveries
        FROM deliveries d
        WHERE DATE(d.scheduled_date) = CURRENT_DATE() AND d.driver_id = ?`,
        [userId]
      );

      const [driverMonthStats] = await db.query(
        `
        SELECT 
          COUNT(d.delivery_id) as month_deliveries
        FROM deliveries d
        WHERE d.scheduled_date BETWEEN ? AND ? AND d.driver_id = ?`,
        [formattedFirstDay, formattedToday + " 23:59:59", userId]
      );

      stats = {
        todayOrders: driverStats[0].today_deliveries || 0,
        todaySales: 0, // Drivers don't deal with sales
        thisMonthOrders: driverMonthStats[0].month_deliveries || 0,
        thisMonthSales: 0,
      };
    }

    // If not a driver, get order stats
    if (userRole !== "lorry_driver") {
      // Get today's stats
      const [todayStats] = await db.query(
        todayStatsQuery + todayStatsCondition
      );

      // Get this month's stats
      const [monthStats] = await db.query(
        monthStatsQuery + monthStatsCondition
      );

      stats = {
        todayOrders: todayStats[0].today_orders || 0,
        todaySales: todayStats[0].today_sales || 0,
        thisMonthOrders: monthStats[0].month_orders || 0,
        thisMonthSales: monthStats[0].month_sales || 0,
      };
    }

    // Get recent activities - top 5
    let recentActivitiesQuery = "";
    const activityLimit = 5;

    // Different activity query based on user role
    if (userRole === "owner") {
      // Owners see all activities
      recentActivitiesQuery = `
        (SELECT 
          'order' as type,
          o.order_id as id,
          CONCAT('New Order #', o.order_id) as title,
          CONCAT('Rs. ', FORMAT(o.total_amount, 2), ' - ', c.name) as description,
          o.order_date as activity_date
        FROM orders o
        JOIN customers c ON o.customer_id = c.customer_id
        ORDER BY o.order_date DESC
        LIMIT ${activityLimit})
        
        UNION ALL
        
        (SELECT 
          'payment' as type,
          p.payment_id as id,
          'Payment Received' as title,
          CONCAT('Rs. ', FORMAT(p.amount, 2), ' - Order #', p.order_id) as description,
          p.payment_date as activity_date
        FROM payments p
        ORDER BY p.payment_date DESC
        LIMIT ${activityLimit})
        
        UNION ALL
        
        (SELECT 
          'delivery' as type,
          d.delivery_id as id,
          CONCAT('Delivery #', d.delivery_id) as title,
          CONCAT('Order #', d.order_id, ' - ', d.status) as description,
          d.updated_at as activity_date
        FROM deliveries d
        ORDER BY d.updated_at DESC
        LIMIT ${activityLimit})
        
        ORDER BY activity_date DESC
        LIMIT ${activityLimit}
      `;
    } else if (userRole === "sales_rep") {
      // Sales reps only see their own orders and payments
      recentActivitiesQuery = `
        (SELECT 
          'order' as type,
          o.order_id as id,
          CONCAT('New Order #', o.order_id) as title,
          CONCAT('Rs. ', FORMAT(o.total_amount, 2), ' - ', c.name) as description,
          o.order_date as activity_date
        FROM orders o
        JOIN customers c ON o.customer_id = c.customer_id
        WHERE o.sales_rep_id = '${userId}'
        ORDER BY o.order_date DESC
        LIMIT ${activityLimit})
        
        UNION ALL
        
        (SELECT 
          'payment' as type,
          p.payment_id as id,
          'Payment Received' as title,
          CONCAT('Rs. ', FORMAT(p.amount, 2), ' - Order #', p.order_id) as description,
          p.payment_date as activity_date
        FROM payments p
        JOIN orders o ON p.order_id = o.order_id
        WHERE o.sales_rep_id = '${userId}'
        ORDER BY p.payment_date DESC
        LIMIT ${activityLimit})
        
        ORDER BY activity_date DESC
        LIMIT ${activityLimit}
      `;
    } else if (userRole === "lorry_driver") {
      // Drivers only see their own deliveries
      recentActivitiesQuery = `
        SELECT 
          'delivery' as type,
          d.delivery_id as id,
          CONCAT('Delivery #', d.delivery_id) as title,
          CONCAT('Order #', d.order_id, ' - ', d.status) as description,
          d.updated_at as activity_date
        FROM deliveries d
        WHERE d.driver_id = '${userId}'
        ORDER BY d.updated_at DESC
        LIMIT ${activityLimit}
      `;
    }

    // Execute the activity query
    const [recentActivities] = await db.query(recentActivitiesQuery);

    // Format activities for frontend display
    const formattedActivities = recentActivities.map((activity) => {
      // Determine icon and color based on activity type
      let icon = "📝";
      let color = "#FF6B6B";

      if (activity.type === "payment") {
        icon = "💵";
        color = "#4ECDC4";
      } else if (activity.type === "delivery") {
        icon = "🚚";
        color = "#FFD166";
      }

      // Format the date/time
      const activityDate = new Date(activity.activity_date);
      const now = new Date();
      let timeString = "";

      if (activityDate.toDateString() === now.toDateString()) {
        // Today - show time
        timeString = activityDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (
        activityDate.toDateString() ===
        new Date(now.setDate(now.getDate() - 1)).toDateString()
      ) {
        // Yesterday
        timeString = "Yesterday";
      } else {
        // Other days - show date
        timeString = activityDate.toLocaleDateString();
      }

      return {
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        time: timeString,
        icon,
        color,
      };
    });

    // Return combined data
    res.json({
      user: {
        id: user.user_id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
      stats,
      recentActivities: formattedActivities,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// Export all controller functions
module.exports = {
  login,
  getProfile,
  updateProfile,
  getDashboardStats,
};
