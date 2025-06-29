const express = require("express");
const router = express.Router();
const salesRepController = require("../controllers/salesRepController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Applying authentication middleware to all routes
router.use(authenticate);

// Get all sales representatives
router.get(
  "/",
  authorize("view_sales_reps"),
  salesRepController.getAllSalesReps
);

// Get sales rep dashboard stats
router.get(
  "/stats",
  authorize("view_sales_reps"),
  salesRepController.getSalesRepDashboardStats
);

// Get a specific sales representative by ID
router.get(
  "/:id",
  authorize("view_sales_reps"),
  salesRepController.getSalesRepById
);

// Add a new sales representative
router.post(
  "/",
  authorize("manage_sales_reps"),
  salesRepController.addSalesRep
);

// Update a sales representative
router.put(
  "/:id",
  authorize("manage_sales_reps"),
  salesRepController.updateSalesRep
);

// Get sales statistics for a specific sales rep
router.get(
  "/:id/stats",
  authorize("view_sales_reps"),
  salesRepController.getSalesRepStats
);

// Get commissions for a specific sales rep
router.get(
  "/:id/commissions",
  authorize("view_sales_reps"),
  salesRepController.getSalesRepCommissions
);

// Calculate commission for a specific sales rep for a month/year
router.post(
  "/:id/commissions",
  authorize("manage_sales_reps"),
  salesRepController.calculateCommission
);

// Update commission status (approve/pay)
router.put(
  "/:id/commissions/:commissionId",
  authorize("manage_sales_reps"),
  salesRepController.updateCommissionStatus
);

router.get(
  "/:id/orders",
  authorize("view_sales_reps"),
  salesRepController.getSalesRepAllOrders
);

module.exports = router;
