const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const { authorize } = require("../middleware/authMiddleware");

// Customer stats and search
router.get(
  "/stats",
  authorize("view_customers"),
  customerController.getCustomerStats
);
router.get(
  "/search",
  authorize("view_customers"),
  customerController.searchCustomers
);
router.get(
  "/areas",
  authorize("view_customers"),
  customerController.getCustomerAreas
);

// Customer CRUD operations
router.get(
  "/",
  authorize("view_customers"),
  customerController.getAllCustomers
);
router.post("/", authorize("add_customer"), customerController.createCustomer);
router.get(
  "/:id",
  authorize("view_customers"),
  customerController.getCustomerById
);
router.put(
  "/:id",
  authorize("edit_customer"),
  customerController.updateCustomer
);
router.delete(
  "/:id",
  authorize("delete_customer"),
  customerController.deleteCustomer
);

// Customer related data
router.get(
  "/:id/orders",
  authorize("view_customers"),
  customerController.getCustomerOrders
);
router.get(
  "/:id/payments",
  authorize("view_customer_payments"),
  customerController.getCustomerPayments
);
router.get(
  "/:id/credits",
  authorize("view_customer_payments"),
  customerController.getCustomerCredits
);

// Customer payment and credit operations
router.post(
  "/:id/payments",
  authorize("manage_customer_payments"),
  customerController.recordPayment
);
router.put(
  "/:id/credit",
  authorize("manage_customer_payments"),
  customerController.updateCustomerCredit
);

module.exports = router;
