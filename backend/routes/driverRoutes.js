const express = require("express");
const router = express.Router();
const driverController = require("../controllers/driverController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Applying authentication middleware to all routes
router.use(authenticate);

// Dashboard statistics
router.get(
  "/dashboard",
  authorize("view_drivers"),
  driverController.getDriverDashboardStats
);

// Driver routes
router.get(
  "/drivers",
  authorize("view_drivers"),
  driverController.getAllDrivers
);
router.get(
  "/drivers/:id",
  authorize("view_drivers"),
  driverController.getDriverById
);
router.get(
  "/drivers/:id/schedule",
  authorize("view_drivers"),
  driverController.getDriverSchedule
);
router.post(
  "/drivers",
  authorize("manage_drivers"),
  driverController.addDriver
);
router.put(
  "/drivers/:id",
  authorize("manage_drivers"),
  driverController.updateDriver
);
router.put(
  "/drivers/:id/toggle-status",
  authorize("manage_drivers"),
  driverController.toggleDriverStatus
);

// Vehicle routes
router.get(
  "/vehicles",
  authorize("view_drivers"),
  driverController.getAllVehicles
);
router.get(
  "/vehicles/:id",
  authorize("view_drivers"),
  driverController.getVehicleById
);
router.post(
  "/vehicles",
  authorize("manage_drivers"),
  driverController.addVehicle
);
router.put(
  "/vehicles/:id",
  authorize("manage_drivers"),
  driverController.updateVehicle
);

// Delivery routes
router.get(
  "/deliveries",
  authorize("view_deliveries"),
  driverController.getDeliveries
);
router.get(
  "/deliveries/:id",
  authorize("view_deliveries"),
  driverController.getDeliveryById
);
router.post(
  "/deliveries",
  authorize("manage_deliveries"),
  driverController.createDelivery
);
router.put(
  "/deliveries/:id/status",
  authorize("update_delivery_status"),
  driverController.updateDeliveryStatus
);

// Maintenance alerts
router.get(
  "/maintenance-alerts",
  authorize("view_drivers"),
  driverController.getMaintenanceAlerts
);

module.exports = router;
