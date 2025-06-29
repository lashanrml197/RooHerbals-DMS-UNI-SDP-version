const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Applying authentication middleware to all routes
router.use(authenticate);

// Dashboard stats for reports landing page
router.get(
  "/dashboard-stats",
  authorize("view_reports"),
  reportController.getDashboardStats
);

// Sales reports
router.get(
  "/sales",
  authorize("view_reports"),
  reportController.getSalesReports
);

// Inventory reports
router.get(
  "/inventory",
  authorize("view_reports"),
  reportController.getInventoryReports
);

// Customer reports
router.get(
  "/customers",
  authorize("view_reports"),
  reportController.getCustomerReports
);

// Commission reports
router.get(
  "/commissions",
  authorize("view_reports"),
  reportController.getCommissionReports
);

// Daily sales report
router.get(
  "/daily-sales",
  authorize("view_reports"),
  reportController.getDailySalesReport
);

// Export data
router.get("/export", authorize("view_reports"), reportController.exportData);

module.exports = router;
