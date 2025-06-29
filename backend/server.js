/**
 * Roo Herbals Distribution Management System (DMS) - Backend Server
 *
 * This is the main Express.js server file that handles:
 * - API routes for various modules
 * - Authentication middleware
 * - CORS configuration
 */

// Core dependencies
const express = require("express");
const cors = require("cors");
require("dotenv").config(); // Load environment variables from .env file

// Import route modules for different business domains
const userRoutes = require("./routes/userRoutes"); // User authentication and management
const customerRoutes = require("./routes/customerRoutes"); // Customer CRUD operations
const reportRoutes = require("./routes/reportRoutes"); // Report generation and analytics
const driverRoutes = require("./routes/driverRoutes"); // Driver and delivery management
const supplierRoutes = require("./routes/supplierRoutes"); // Supplier and inventory management
const productRoutes = require("./routes/productRoutes"); // Product catalog management
const orderRoutes = require("./routes/orderRoutes"); // Order processing and management
const addOrderRoutes = require("./routes/addOrderRoutes"); // Additional order creation endpoints
const salesRepRoutes = require("./routes/salesRepRoutes"); // Sales representative management

// Initialize Express application
const app = express();
const port = process.env.PORT || 3000; // Use environment port or default to 3000

// ================================
// MIDDLEWARE CONFIGURATION
// ================================

// Enable Cross-Origin Resource Sharing (CORS) for frontend communication
app.use(cors());

// Parse incoming JSON requests (body parser)
app.use(express.json());

// Import authentication middleware for protected routes
const { authenticate } = require("./middleware/authMiddleware");

// ================================
// ROUTE CONFIGURATION
// ================================

// Public Routes (no authentication required)
// That means these endpoints can be accessed without a valid JWT token
app.use("/api/users", userRoutes); // Login, registration, password reset

// Protected Routes (authentication required)
// All endpoints below require a valid JWT token in the Authorization header
app.use("/api/customers", authenticate, customerRoutes); // Customer management operations
app.use("/api/reports", authenticate, reportRoutes); // Business reports and analytics
app.use("/api/drivers", authenticate, driverRoutes); // Driver and vehicle management
app.use("/api/suppliers", authenticate, supplierRoutes); // Supplier and inventory operations
app.use("/api/products", authenticate, productRoutes); // Product catalog management
app.use("/api/orders", authenticate, orderRoutes); // Order processing and tracking
app.use("/api/addorder", authenticate, addOrderRoutes); // Additional order creation endpoints
app.use("/api/salesreps", authenticate, salesRepRoutes); // Sales representative management

// ================================
// UTILITY AND TEST ENDPOINTS
// ================================

// Root endpoint - Basic API status check
app.get("/", (req, res) => {
  res.send("Roo Herbals DMS API is running");
});

// Health check endpoint for monitoring and load balancers
// Returns server status and current timestamp
app.get("/api/health-check", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// Development endpoint for testing password hashing functionality
// This endpoint should be removed in production for security reasons
const bcrypt = require("bcrypt");
app.get("/api/test-password/:password", async (req, res) => {
  try {
    const { password } = req.params;

    // Hash the provided password with salt rounds of 10
    const hashedPassword = await bcrypt.hash(password, 10);

    // Verify that the hashing worked correctly
    const isValid = await bcrypt.compare(password, hashedPassword);

    // Return original password, hashed version, and verification result
    res.json({
      original: password,
      hashed: hashedPassword,
      verified: isValid,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================================
// SERVER STARTUP
// ================================

// Start the Express server on the specified port
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(
    `Health check available at: http://localhost:${port}/api/health-check`
  );
});
