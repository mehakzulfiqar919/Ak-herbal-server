/**
 * JazzCash Payment Gateway Integration
 * ------------------------------------
 * STATUS: Structure ready, NOT yet active.
 *
 * To activate real JazzCash payments, you need a JazzCash Merchant Account.
 * Apply at: https://www.jazzcash.com.pk/business/
 *
 * Once approved, JazzCash will give you:
 *   - Merchant ID
 *   - Password
 *   - Integrity Salt (HashKey)
 *   - Return URL configuration (where JazzCash redirects after payment)
 *
 * Put those values in your .env file (see .env.example below this file's
 * comments), and this module will start working automatically — no other
 * code changes needed elsewhere in the app.
 *
 * JazzCash uses their "Mobile Account" or "Page Redirect" API, which works
 * by:
 *   1. Your server builds a signed request (with HMAC-SHA256 using the
 *      Integrity Salt) containing order amount + order ref number.
 *   2. Customer is redirected to JazzCash's hosted payment page.
 *   3. After payment, JazzCash redirects back to your Return URL with a
 *      signed response, which your server must verify before marking the
 *      order as paid.
 *
 * Official docs (read before going live):
 * https://sandbox.jazzcash.com.pk/Sandbox/Doc/JazzCash_PaymentGateway_API.pdf
 */

const crypto = require("crypto");

const isConfigured = () => {
  return Boolean(
    process.env.JAZZCASH_MERCHANT_ID &&
      process.env.JAZZCASH_PASSWORD &&
      process.env.JAZZCASH_INTEGRITY_SALT
  );
};

/**
 * Builds the signed payload JazzCash expects for their Page Redirect API.
 * Returns null if JazzCash credentials aren't configured yet.
 */
const buildPaymentRequest = ({ orderNumber, amountInRupees, customerPhone, returnUrl }) => {
  if (!isConfigured()) {
    return null;
  }

  const pp_Amount = String(Math.round(amountInRupees * 100)); // JazzCash expects paisa, no decimals
  const pp_TxnRefNo = `T${orderNumber}`;
  const pp_TxnDateTime = new Date()
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 14);
  const pp_TxnExpiryDateTime = new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 14);

  const fields = {
    pp_Version: "1.1",
    pp_TxnType: "MWALLET",
    pp_Language: "EN",
    pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID,
    pp_Password: process.env.JAZZCASH_PASSWORD,
    pp_TxnRefNo,
    pp_Amount,
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime,
    pp_TxnExpiryDateTime,
    pp_BillReference: orderNumber,
    pp_Description: `AK Herbal Products Order ${orderNumber}`,
    pp_ReturnURL: returnUrl,
    pp_MobileNumber: customerPhone?.replace(/\D/g, "") || "",
  };

  // JazzCash requires a HMAC-SHA256 secure hash of sorted field values,
  // prefixed with the Integrity Salt.
  const sortedKeys = Object.keys(fields).sort();
  const hashString =
    process.env.JAZZCASH_INTEGRITY_SALT +
    "&" +
    sortedKeys.map((k) => fields[k]).join("&");

  const pp_SecureHash = crypto
    .createHmac("sha256", process.env.JAZZCASH_INTEGRITY_SALT)
    .update(hashString)
    .digest("hex")
    .toUpperCase();

  return { ...fields, pp_SecureHash };
};

/**
 * Verifies the response JazzCash sends back after payment.
 * Always verify server-side before trusting a payment succeeded.
 */
const verifyResponse = (responseFields) => {
  if (!isConfigured()) {
    return { valid: false, reason: "JazzCash not configured" };
  }

  const { pp_SecureHash, ...rest } = responseFields;
  const sortedKeys = Object.keys(rest).sort();
  const hashString =
    process.env.JAZZCASH_INTEGRITY_SALT +
    "&" +
    sortedKeys.map((k) => rest[k]).join("&");

  const expectedHash = crypto
    .createHmac("sha256", process.env.JAZZCASH_INTEGRITY_SALT)
    .update(hashString)
    .digest("hex")
    .toUpperCase();

  const valid = expectedHash === pp_SecureHash && responseFields.pp_ResponseCode === "000";

  return { valid, responseCode: responseFields.pp_ResponseCode };
};

module.exports = { isConfigured, buildPaymentRequest, verifyResponse };
