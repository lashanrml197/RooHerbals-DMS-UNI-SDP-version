const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Applying authentication middleware to all routes
router.use(authenticate);

// Get order statistics for dashboard
router.get("/stats", authorize("view_orders"), orderController.getOrderStats);

// Get all orders with filtering, pagination, and sorting
router.get("/", authorize("view_orders"), orderController.getAllOrders);

// Get order details by ID
router.get("/:id", authorize("view_orders"), orderController.getOrderById);

// Create a new order
router.post("/", authorize("add_order"), orderController.createOrder);

// Update order status
router.put(
  "/:id/status",
  authorize("edit_order"),
  orderController.updateOrderStatus
);

// Update order payment status and record payment
router.put(
  "/:id/payment",
  authorize("manage_customer_payments"),
  orderController.updatePaymentStatus
);

// Process return for an order
router.post(
  "/:id/return",
  authorize("edit_order"),
  orderController.processReturn
);

// Get order history for a specific customer
router.get(
  "/customer/:customerId",
  authorize("view_orders"),
  orderController.getCustomerOrderHistory
);

// Assign delivery to an order
router.post(
  "/:id/delivery",
  authorize("manage_deliveries"),
  orderController.assignDelivery
);

// Update delivery status
router.put(
  "/delivery/:id",
  authorize("update_delivery_status"),
  orderController.updateDeliveryStatus
);

// Add notes to an order
router.post(
  "/:id/notes",
  authorize("edit_order"),
  orderController.addOrderNotes
);

// Get deliveries for a specific driver
router.get(
  "/driver/:driverId/deliveries",
  authorize("view_deliveries"),
  orderController.getDriverDeliveries
);

module.exports = router;
