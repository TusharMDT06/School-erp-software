const Razorpay = require("razorpay");

const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder_key_id";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_placeholder_key_secret";

let razorpay = null;

try {
  razorpay = new Razorpay({
    key_id,
    key_secret,
  });
} catch (error) {
  console.warn("⚠️ Razorpay initialization warning:", error.message);
}

module.exports = razorpay;
