const express = require("express");
const { getUploadSignature } = require("../controllers/uploadControllers");

const router = express.Router();

router.route("/signature").post(getUploadSignature);

module.exports = router;
