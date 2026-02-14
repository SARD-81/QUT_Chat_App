const crypto = require("crypto");
const asyncHandler = require("express-async-handler");

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
];

const signCloudinaryParams = (params, apiSecret) => {
  const signatureBase = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${signatureBase}${apiSecret}`).digest("hex");
};

const getUploadSignature = asyncHandler(async (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    res.status(500);
    throw new Error("Cloudinary credentials are not configured");
  }

  const { fileName, mimeType, size, usage } = req.body || {};

  if (!fileName || !mimeType || !size) {
    res.status(400);
    throw new Error("fileName, mimeType, and size are required");
  }

  const numericSize = Number(size);
  if (!Number.isFinite(numericSize) || numericSize <= 0 || numericSize > MAX_FILE_SIZE_BYTES) {
    res.status(400);
    throw new Error(`File exceeds allowed size limit (${MAX_FILE_SIZE_BYTES} bytes)`);
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    res.status(400);
    throw new Error("File type is not allowed");
  }

  const isAvatarUpload = usage === "avatar";

  if (isAvatarUpload && !mimeType.startsWith("image/")) {
    res.status(400);
    throw new Error("Avatar uploads must be image files");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = isAvatarUpload ? "chat-app/avatars" : "chat-app/attachments";
  const publicId = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;

  const paramsToSign = {
    folder,
    public_id: publicId,
    timestamp,
  };

  const signature = signCloudinaryParams(paramsToSign, apiSecret);

  res.json({
    timestamp,
    signature,
    cloudName,
    apiKey,
    folder,
    publicId,
    resourceType: "auto",
    maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });
});

module.exports = {
  getUploadSignature,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
};
