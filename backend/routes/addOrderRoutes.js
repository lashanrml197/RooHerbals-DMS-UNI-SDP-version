const express = require("express");
const router = express.Router();
const addOrderController = require("../controllers/addOrderController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Applying authentication middleware to all routes in this router
router.use(authenticate);

// Routes for adding orders
router.get(
  "/customers",
  authorize("view_customers"),
  addOrderController.getCustomers
);
router.get(
  "/products",
  authorize("view_products"),
  addOrderController.getProducts
);
router.get(
  "/products/:productId/batches",
  authorize("view_products"),
  addOrderController.getProductBatches
);
router.get(
  "/customers/:customerId/orders",
  authorize("view_customers"),
  addOrderController.getCustomerOrders
);
router.get(
  "/orders/:orderId/items",
  authorize("view_orders"),
  addOrderController.getOrderItems
);
router.post("/create", authorize("add_order"), addOrderController.createOrder);

module.exports = router;
