const express = require("express");
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  createStudent,
  listStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  uploadDocuments,
  getMyStudentProfile,
} = require("../controllers/student.controller");

const router = express.Router();

// ─── Multer configuration ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /pdf|jpg|jpeg|png|gif|doc|docx/i;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, images, and Word documents are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
});

// ─── Routes ────────────────────────────────────────────────────────────────
router.use(authMiddleware);

router
  .route("/")
  .post(authorizeRoles("admin", "superadmin"), createStudent)
  .get(authorizeRoles("admin", "superadmin", "teacher", "student", "parent"), listStudents);

// ─── Student self-profile (student role only, must be BEFORE /:id) ─────────
router.get("/me", authorizeRoles("student"), getMyStudentProfile);

router
  .route("/:id")
  .get(authorizeRoles("admin", "superadmin", "teacher", "student", "parent"), getStudent)
  .put(authorizeRoles("admin", "superadmin"), updateStudent)
  .delete(authorizeRoles("admin", "superadmin"), deleteStudent);

router.post(
  "/:id/documents",
  authorizeRoles("admin", "superadmin"),
  upload.array("documents", 10), // up to 10 files at once
  uploadDocuments
);

module.exports = router;
