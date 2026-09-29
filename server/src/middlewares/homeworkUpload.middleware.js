const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { ApiError } = require("../utils/apiResponse");

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${sanitizedBase}-${unique}${ext}`);
  },
});

// Allowed MIME types whitelist
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/msword", // doc
  "application/vnd.ms-powerpoint", // ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".docx",
  ".doc",
  ".ppt",
  ".pptx",
]);

const homeworkFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  // Strict MIME type and extension validation server-side
  if (!ALLOWED_MIME_TYPES.has(mime) || !ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      new ApiError(
        400,
        `Invalid file type (${mime}). Only PDF, JPEG, PNG, DOCX, DOC, and PPT files are permitted.`
      ),
      false
    );
  }

  cb(null, true);
};

// Max 10 MB per file, max 5 files
const homeworkUpload = multer({
  storage,
  fileFilter: homeworkFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 5,
  },
});

module.exports = {
  homeworkUpload,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
};
