/**
 * WhatsApp integration via the free "click-to-chat" API (wa.me / api.whatsapp.com).
 * No WhatsApp Business API account needed — generates a deep link that opens
 * WhatsApp with a pre-filled message. Works for both:
 *   1. Customer -> Store (e.g. "Chat to confirm order" button after checkout)
 *   2. Store -> Customer (admin clicks to message a customer about their order)
 *
 * For production-scale automated WhatsApp notifications (no manual click),
 * you'd later upgrade to the official WhatsApp Business Cloud API — this
 * util is structured so that swap is a drop-in change in one place.
 */

const STORE_NUMBER = process.env.WHATSAPP_BUSINESS_NUMBER; // e.g. 911234567890, no + or spaces

const buildOrderConfirmationMessage = (order) => {
  const itemLines = order.items
    .map((item) => `- ${item.name} x${item.quantity} = Rs ${item.price * item.quantity}`)
    .join("\n");

  return (
    `Hello Organic.basti.AK \n` +
    `I just placed an order.\n\n` +
    `*Order #:* ${order.orderNumber}\n` +
    `*Name:* ${order.customer.name}\n` +
    `*Phone:* ${order.customer.phone}\n\n` +
    `*Items:*\n${itemLines}\n\n` +
    `*Total: Rs ${order.grandTotal}*\n` +
    `*Payment:* ${order.paymentMethod}\n\n` +
    `Please confirm my order. Thank you!`
  );
};

const buildCustomerWhatsAppLink = (order) => {
  const message = encodeURIComponent(buildOrderConfirmationMessage(order));
  return `https://wa.me/${STORE_NUMBER}?text=${message}`;
};

const buildAdminToCustomerLink = (order, customMessage) => {
  const phone = order.customer.phone.replace(/\D/g, ""); // strip non-digits
  const message = encodeURIComponent(
    customMessage ||
    `Hi ${order.customer.name}, this is AK Herbal Products regarding your order #${order.orderNumber}.`
  );
  return `https://wa.me/${phone}?text=${message}`;
};

module.exports = {
  buildOrderConfirmationMessage,
  buildCustomerWhatsAppLink,
  buildAdminToCustomerLink,
};
