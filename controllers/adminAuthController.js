const Admin = require("../models/Admin");
const generateToken = require("../utils/generateToken");

// @desc    Login admin
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in admin profile
// @route   GET /api/admin/profile
// @access  Private
const getAdminProfile = async (req, res, next) => {
  try {
    res.json(req.admin);
  } catch (error) {
    next(error);
  }
};

// @desc    Register new admin (only usable by superadmin in production)
// @route   POST /api/admin/register
// @access  Private/Superadmin (open in dev — lock down before launch)
const registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Admin with this email already exists" });
    }

    const admin = await Admin.create({ name, email, password, role });

    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { loginAdmin, getAdminProfile, registerAdmin };
