const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate } = require("../middleware/authMiddleware");

// Public routes
router.post("/login", userController.login);

// Protected routes - require authentication
router.get("/profile", authenticate, userController.getProfile);
router.put("/profile", authenticate, userController.updateProfile);

router.get("/dashboard", authenticate, userController.getDashboardStats);
module.exports = router;
