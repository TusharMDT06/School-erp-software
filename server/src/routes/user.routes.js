const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const User = require("../models/User.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

router.use(authMiddleware);

/**
 * POST /api/users/me/push-token
 * Register device Expo push token for push notifications
 */
router.post("/me/push-token", async (req, res, next) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken || typeof pushToken !== "string") {
      throw new ApiError(400, "Valid push token string is required.");
    }

    const userId = req.user._id || req.user.id;
    const user = await User.findByIdAndUpdate(
      userId,
      { pushToken: pushToken.trim() },
      { new: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, { pushToken: user.pushToken }, "Push token registered successfully."));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
