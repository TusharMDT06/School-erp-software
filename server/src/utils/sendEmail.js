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
  const apiKey = (process.env.RESEND_API_KEY || "").trim();

  if (!apiKey) {
    console.warn("⚠️  RESEND_API_KEY not set — email NOT sent. Would have sent:");
    console.warn(`   To:      ${Array.isArray(to) ? to.join(", ") : to}`);
    console.warn(`   Subject: ${subject}`);
    return { id: "dev-mock-email-id" };
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.RESEND_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "School ERP <onboarding@resend.dev>";

  const recipients = Array.isArray(to) ? to : [to];

  const { data, error } = await resend.emails.send({
    from,
    to: recipients,
    subject,
    html,
  });

  if (error) {
    // Check if error is Resend unverified recipient restriction on free tier
    const msg = error.message || "";
    const match = msg.match(/only send testing emails to your own email address \(([^)]+)\)/i);

    if (match && match[1]) {
      const allowedOwnerEmail = match[1].trim();
      console.warn(
        `⚠️  Resend test-mode restriction: Cannot send to "${recipients.join(", ")}". Redirecting test email to account owner: ${allowedOwnerEmail}`
      );

      const modifiedHtml = `
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-family: sans-serif; font-size: 13px; color: #92400e;">
          <strong>ℹ️ Resend Testing Notice:</strong> This email was originally addressed to <code>${recipients.join(", ")}</code>. In Resend free-tier sandbox mode, emails are routed to your verified account email. To send directly to external recipients, verify a custom domain at <a href="https://resend.com/domains" target="_blank">resend.com/domains</a>.
        </div>
        ${html}
      `;

      const fallbackResult = await resend.emails.send({
        from,
        to: [allowedOwnerEmail],
        subject: `[Test for ${recipients.join(", ")}] ${subject}`,
        html: modifiedHtml,
      });

      if (!fallbackResult.error) {
        console.log(`📧 Email delivered via Resend to ${allowedOwnerEmail}:`, fallbackResult.data?.id);
        return fallbackResult.data;
      }
    }

    console.error("❌ Resend email error:", error);
    throw new Error(`Email sending failed: ${error.message}`);
  }

  console.log("📧 Email sent via Resend:", data?.id);
  return data;
};

module.exports = sendEmail;
