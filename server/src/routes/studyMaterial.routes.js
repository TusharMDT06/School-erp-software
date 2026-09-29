const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { homeworkUpload } = require("../middlewares/homeworkUpload.middleware");
const {
  createStudyMaterial,
  getMyStudyMaterials,
  updateStudyMaterial,
  togglePublishMaterial,
  deleteStudyMaterial,
} = require("../controllers/studyMaterial.controller");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  authorizeRoles("teacher"),
  homeworkUpload.single("file"),
  createStudyMaterial
);

router.get("/mine", authorizeRoles("teacher"), getMyStudyMaterials);

router.put(
  "/:id",
  authorizeRoles("teacher"),
  homeworkUpload.single("file"),
  updateStudyMaterial
);

router.put("/:id/toggle-publish", authorizeRoles("teacher"), togglePublishMaterial);

router.delete("/:id", authorizeRoles("teacher"), deleteStudyMaterial);

module.exports = router;
