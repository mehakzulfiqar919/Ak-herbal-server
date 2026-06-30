const express = require("express");
const router = express.Router();
const {
  createOrder,
  trackOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");

// Public — guest checkout, no login required
router.post("/", createOrder);
router.get("/track/:orderNumber", trackOrder);

// Admin
router.get("/", protect, getOrders);
router.get("/:id", protect, getOrderById);
router.patch("/:id/status", protect, updateOrderStatus);

module.exports = router;
