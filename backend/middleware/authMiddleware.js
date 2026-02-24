const jwt = require("jsonwebtoken");
const User = require("../models/userModel.js");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/ApiError");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      throw new ApiError(401, "AUTH_TOKEN_FAILED", "Not authorized, token failed");
    }
  }

  if (!token) {
    throw new ApiError(401, "AUTH_NO_TOKEN", "Not authorized, no token");
  }
});

module.exports = { protect };
