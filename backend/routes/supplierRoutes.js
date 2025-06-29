const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplierController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Applying authentication middleware to all routes
router.use(authenticate);

// ==================== SUPPLIER MANAGEMENT ====================

// Get supplier dashboard stats
router.get(
  "/stats",
  authorize("view_suppliers"),
  supplierController.getSupplierStats
);

// Get all suppliers
router.get(
  "/",
  authorize("view_suppliers"),
  supplierController.getAllSuppliers
);

// Get supplier by ID
router.get(
  "/:id",
  authorize("view_suppliers"),
  supplierController.getSupplierById
);

// Create a new supplier
router.post(
  "/",
  authorize("manage_suppliers"),
  supplierController.createSupplier
);

// Update a supplier
router.put(
  "/:id",
  authorize("manage_suppliers"),
  supplierController.updateSupplier
);

// Deactivate a supplier (soft delete)
router.delete(
  "/:id",
  authorize("manage_suppliers"),
  supplierController.deactivateSupplier
);

// ==================== INVENTORY MANAGEMENT ====================

// Get inventory stats
router.get(
  "/inventory/stats",
  authorize("view_inventory"),
  supplierController.getInventoryStats
);

// Get all inventory items
router.get(
  "/inventory/items",
  authorize("view_inventory"),
  supplierController.getAllInventory
);

// Get product by ID
router.get(
  "/inventory/products/:id",
  authorize("view_inventory"),
  supplierController.getProductById
);

// Add a new product batch
router.post(
  "/inventory/batches",
  authorize("manage_inventory"),
  supplierController.addProductBatch
);

// Adjust product batch quantity
router.put(
  "/inventory/batches/:id",
  authorize("manage_inventory"),
  supplierController.adjustBatchQuantity
);

// Update product batch selling price
router.put(
  "/inventory/batches/:id/price",
  authorize("manage_inventory"),
  supplierController.updateBatchSellingPrice
);

// ==================== PURCHASE ORDERS MANAGEMENT ====================

// Get all purchase orders
router.get(
  "/purchase-orders",
  authorize("view_suppliers"),
  supplierController.getAllPurchaseOrders
);

// Get products by supplier for dropdown
router.get(
  "/purchase-orders/supplier/:id/products",
  authorize("view_suppliers"),
  supplierController.getProductsBySupplier
);

// Get purchase order by ID
router.get(
  "/purchase-orders/:id",
  authorize("view_suppliers"),
  supplierController.getPurchaseOrderById
);

// Create a new purchase order
router.post(
  "/purchase-orders",
  authorize("manage_suppliers"),
  supplierController.createPurchaseOrder
);

// Update purchase order status
router.put(
  "/purchase-orders/:id/status",
  authorize("manage_suppliers"),
  supplierController.updatePurchaseOrderStatus
);

// Update purchase order details
router.put(
  "/purchase-orders/:id",
  authorize("manage_suppliers"),
  supplierController.updatePurchaseOrder
);

module.exports = router;
