const jwt = require("jsonwebtoken");
require("dotenv").config();

// Permission mappings for different roles
const permissionsByRole = {
  owner: [
    "view_customers",
    "add_customer",
    "edit_customer",
    "delete_customer",
    "view_customer_payments",
    "manage_customer_payments",
    "view_orders",
    "add_order",
    "edit_order",
    "delete_order",
    "manage_deliveries",
    "view_deliveries",
    "view_products",
    "manage_products",
    "view_suppliers",
    "manage_suppliers",
    "view_sales_reps",
    "manage_sales_reps",
    "view_drivers",
    "manage_drivers",
    "view_reports",
    "manage_reports",
    "view_inventory",
    "manage_inventory",
  ],
  sales_rep: [
    "view_customers",
    "add_customer",
    "edit_customer",
    "view_customer_payments",
    "manage_customer_payments",
    "view_orders",
    "add_order",
    "edit_order",
    "delete_order",
    "view_products",
  ],
  lorry_driver: [
    "view_customers",
    "view_customer_payments",
    "manage_customer_payments",
    "view_orders",
    "update_delivery_status",
    "view_deliveries",
    "view_products",
  ],
};

// Authentication middleware - Verify with JWT token
const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret-key-when-fallback"
    );

    // Add user info to request
    req.user = decoded;

    // Add user ID specifically for use in controllers
    req.userId = decoded.id;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token expired, please login again" });
    }
    res.status(401).json({ message: "Invalid token" });
  }
};

// Authorization middleware - Check user permissions
const authorize = (requiredPermission) => {
  return (req, res, next) => {
    try {
      // Get user role from request (set by authenticate middleware)
      const { role } = req.user;

      if (!role) {
        return res
          .status(403)
          .json({ message: "Unauthorized: Role not defined" });
      }

      // Get permissions for the user role
      const rolePermissions = permissionsByRole[role] || [];

      // Check if user has required permission
      if (!rolePermissions.includes(requiredPermission)) {
        return res.status(403).json({
          message: `Unauthorized: Requires ${requiredPermission} permission`,
        });
      }

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      res.status(403).json({ message: "Unauthorized access" });
    }
  };
};

module.exports = { authenticate, authorize };
