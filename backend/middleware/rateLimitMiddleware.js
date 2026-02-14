const rateLimit = require("express-rate-limit");

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 20;

const authRateLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests. Please try again shortly.",
  handler: (req, res, next, options) => {
    res.status(options.statusCode);
    next(new Error(options.message));
  },
});

module.exports = { authRateLimiter };
