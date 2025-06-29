const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Applying authentication middleware to all routes
router.use(authenticate);

// Get all products - accessible to all users with view_products permission
router.get("/", authorize("view_products"), productController.getAllProducts);

// Get categories for product dropdown
router.get(
  "/categories",
  authorize("view_products"),
  productController.getAllCategories
);

// Get suppliers for product batch creation
router.get(
  "/suppliers",
  authorize("view_products"),
  productController.getAllSuppliers
);

// Get low stock products
router.get(
  "/low-stock",
  authorize("view_products"),
  productController.getLowStockProducts
);

// Get a single product by ID
router.get(
  "/:id",
  authorize("view_products"),
  productController.getProductById
);

// Create a new product
router.post("/", authorize("manage_products"), productController.createProduct);

// Update a product
router.put(
  "/:id",
  authorize("manage_products"),
  productController.updateProduct
);

// Delete a product
router.delete(
  "/:id",
  authorize("manage_products"),
  productController.deleteProduct
);

// Add a new batch for an existing product
router.post(
  "/:product_id/batches",
  authorize("manage_products"),
  productController.addProductBatch
);

// Update a batch
router.put(
  "/batches/:batch_id",
  authorize("manage_products"),
  productController.updateProductBatch
);

module.exports = router;
