import axios from "axios";

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
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

export const validateAttachmentFile = (file, { avatarOnly = false } = {}) => {
  if (!file) {
    return "Please select a file.";
  }

  if (avatarOnly && !file.type.startsWith("image/")) {
    return "Only images are allowed for profile pictures.";
  }

  if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)) {
    return "Unsupported file type.";
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return "File is too large. Max size is 10MB.";
  }

  return null;
};

export const uploadFileToCloudinary = async (file, usage = "attachment") => {
  const { data: signatureData } = await axios.post("/api/upload/signature", {
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    usage,
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signatureData.apiKey);
  formData.append("timestamp", signatureData.timestamp);
  formData.append("signature", signatureData.signature);
  formData.append("folder", signatureData.folder);
  formData.append("public_id", signatureData.publicId);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${signatureData.resourceType}/upload`;
  const { data: uploaded } = await axios.post(uploadUrl, formData);

  return {
    url: uploaded.secure_url,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    resourceType: uploaded.resource_type,
    publicId: uploaded.public_id,
  };
};
