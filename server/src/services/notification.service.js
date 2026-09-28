const { getIO } = require("../config/socket");
const User = require("../models/User.model");
const sendEmail = require("../utils/sendEmail");

/**
 * notify — send real-time socket notification and optional email to a single user.
 */
const notify = async (userId, { type = "general", title = "Notification", message = "", data = {}, sendEmailFlag = false } = {}) => {
  try {
    const io = getIO();
    if (io && userId) {
      const room = `user:${userId.toString()}`;
      io.to(room).emit("notification", {
        type,
        title,
        message,
        data,
        createdAt: new Date(),
      });
    }

    if (sendEmailFlag && userId) {
      const user = await User.findById(userId).select("name email").lean();
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `[School ERP] ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 16px; color: #1e293b;">
              <h2 style="color: #4f46e5; margin-bottom: 8px;">${title}</h2>
              <p style="font-size: 15px; line-height: 1.5;">${message}</p>
              <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Automated notification from School ERP.</p>
            </div>
          `,
        }).catch((err) => console.warn("[notification.service] Email delivery failed:", err.message));
      }
    }
  } catch (err) {
    console.warn("[notification.service] notify error:", err.message);
  }
};

/**
 * notifyMany — notify multiple users matching an array of IDs or a MongoDB query.
 * Example: notifyMany({ schoolId, role: { $in: ["admin", "superadmin"] } }, { type: "expense_approval_needed", ... })
 */
const notifyMany = async (target, payload = {}) => {
  try {
    let userIds = [];
    if (Array.isArray(target)) {
      userIds = target;
    } else if (typeof target === "object" && target !== null) {
      const users = await User.find(target).select("_id email").lean();
      userIds = users.map((u) => u._id);
    }

    await Promise.allSettled(userIds.map((uid) => notify(uid, payload)));
  } catch (err) {
    console.warn("[notification.service] notifyMany error:", err.message);
  }
};

module.exports = {
  notify,
  notifyMany,
};
