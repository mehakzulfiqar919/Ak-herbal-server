const Order = require("../models/Order");
const Product = require("../models/Product");
const { buildCustomerWhatsAppLink } = require("../utils/whatsapp");
const { isConfigured: isJazzCashConfigured, buildPaymentRequest } = require("../utils/jazzcash");

const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(100 + Math.random() * 900);
  return `AKH${timestamp}${random}`;
};

// @desc    Create new order (guest checkout — no login required)
// @route   POST /api/orders
// @access  Public
const createOrder = async (req, res, next) => {
  try {
    const { customer, shippingAddress, items, paymentMethod, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No order items" });
    }
    if (!customer?.name || !customer?.phone) {
      return res.status(400).json({ message: "Customer name and phone are required" });
    }

    // Re-fetch product data server-side to prevent price tampering from client
    let itemsTotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `Product unavailable: ${item.name || item.product}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      const effectivePrice = product.discountPrice || product.price;
      itemsTotal += effectivePrice * item.quantity;

      verifiedItems.push({
        product: product._id,
        name: product.name,
        price: effectivePrice,
        quantity: item.quantity,
        image: product.images?.[0]?.url || "",
      });
    }

    const shippingFee = 300; // example free-shipping threshold
    const grandTotal = itemsTotal + shippingFee;

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customer,
      shippingAddress,
      items: verifiedItems,
      itemsTotal,
      shippingFee,
      grandTotal,
      paymentMethod: paymentMethod || "COD",
      notes,
    });

    // Decrement stock
    for (const item of verifiedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    // If customer chose JazzCash and it's configured, build the signed
    // payment request the frontend needs to redirect to JazzCash's page.
    // If JazzCash isn't configured yet, this stays null and the order
    // simply behaves like a pending-payment order (admin can confirm
    // payment manually once received, same as COD).
    let jazzcashPayload = null;
    if (paymentMethod === "JAZZCASH" && isJazzCashConfigured()) {
      jazzcashPayload = buildPaymentRequest({
        orderNumber: order.orderNumber,
        amountInRupees: grandTotal,
        customerPhone: customer.phone,
        returnUrl: `${process.env.CLIENT_URL}/order-success/${order.orderNumber}`,
      });
    }

    res.status(201).json({
      ...order.toObject(),
      whatsappLink: buildCustomerWhatsAppLink(order),
      jazzcash: jazzcashPayload,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by order number (guest order tracking, no auth)
// @route   GET /api/orders/track/:orderNumber
// @access  Public
const trackOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.orderStatus = status;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Order.countDocuments(query),
    ]);

    res.json({ orders, page: pageNum, pages: Math.ceil(total / limitNum), total });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order by ID (admin)
// @route   GET /api/orders/:id
// @access  Private/Admin
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (admin)
// @route   PATCH /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();
    res.json(order);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  trackOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
};
