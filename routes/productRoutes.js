const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductBySlug,
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
} = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");

// Public storefront routes
router.get("/", getProducts);
router.get("/admin/all", protect, getAllProductsAdmin); // before /:slug so it isn't swallowed
router.get("/:slug", getProductBySlug);

// Admin routes
router.post("/", protect, createProduct);
router.put("/:id", protect, updateProduct);
router.delete("/:id", protect, deleteProduct);
router.patch("/:id/toggle-active", protect, toggleProductActive);

module.exports = router;
