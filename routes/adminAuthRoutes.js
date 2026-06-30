const express = require("express");
const router = express.Router();
const { loginAdmin, getAdminProfile, registerAdmin } = require("../controllers/adminAuthController");
const { protect, isSuperAdmin } = require("../middleware/authMiddleware");

router.post("/login", loginAdmin);
router.get("/profile", protect, getAdminProfile);

// Lock this down to superadmin-only once you have your first admin account created
//router.post("/register", registerAdmin);

module.exports = router;
