const Notification = require("../models/Notification.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * GET /api/notifications
 * Retrieve notifications for the current authenticated user with unread count.
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        { notifications, unreadCount },
        "Notifications fetched successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read.
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw new ApiError(404, "Notification not found or access denied");
    }

    return res.status(200).json(
      new ApiResponse(200, notification, "Notification marked as read")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all unread notifications for the user as read.
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return res.status(200).json(
      new ApiResponse(200, null, "All notifications marked as read")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification.
 */
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({ _id: id, userId });

    if (!notification) {
      throw new ApiError(404, "Notification not found or access denied");
    }

    return res.status(200).json(
      new ApiResponse(200, null, "Notification deleted successfully")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/clear-all
 * Clear all notifications for the authenticated user.
 */
const clearAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Notification.deleteMany({ userId });

    return res.status(200).json(
      new ApiResponse(200, null, "All notifications cleared")
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};
