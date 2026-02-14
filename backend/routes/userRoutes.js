const express = require("express");
const {
  registerUser,
  authUser,
  allUsers,
} = require("../controllers/userControllers");
const { protect } = require("../middleware/authMiddleware");
const { authRateLimiter } = require("../middleware/rateLimitMiddleware");

const router = express.Router();

router.route("/").get(authRateLimiter, protect, allUsers);
router.route("/").post(authRateLimiter, registerUser);
router.post("/login", authRateLimiter, authUser);

module.exports = router;
