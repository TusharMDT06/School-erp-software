const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/concession.controller");

router.use(authMiddleware);

router.post("/", authorizeRoles("accountant", "admin", "superadmin"), ctrl.createConcession);
router.get("/", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getConcessions);
router.put("/:id/decide", authorizeRoles("admin", "superadmin", "principal"), ctrl.decideConcession);

module.exports = router;
