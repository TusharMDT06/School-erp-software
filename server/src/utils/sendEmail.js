const { Resend } = require("resend");

/**
 * Send a transactional email via Resend.
 *
 * @param {Object} options
 * @param {string|string[]} options.to      - Recipient email(s)
 * @param {string}          options.subject - Email subject
 * @param {string}          options.html    - HTML body
 * @returns {Promise<Object>}               - Resend API response
 */
const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // In development, log the email instead of throwing so the app still works
    console.warn("⚠️  RESEND_API_KEY not set — email NOT sent. Would have sent:");
    console.warn(`   To:      ${Array.isArray(to) ? to.join(", ") : to}`);
    console.warn(`   Subject: ${subject}`);
    return { id: "dev-mock-email-id" };
  }

  const resend = new Resend(apiKey);

  const from =
    process.env.RESEND_FROM ||
    process.env.EMAIL_FROM ||
    "School ERP <noreply@schoolerp.com>";

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) {
    console.error("❌ Resend email error:", error);
    throw new Error(`Email sending failed: ${error.message}`);
  }

  console.log("📧 Email sent via Resend:", data?.id);
  return data;
};

module.exports = sendEmail;
