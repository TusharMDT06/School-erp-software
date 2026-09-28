const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/report.controller");

router.use(authMiddleware);

const canAccess = authorizeRoles("accountant", "admin", "superadmin", "principal");

router.get("/collection", canAccess, ctrl.getCollectionReport);
router.get("/collection/export", canAccess, (req, res, next) => { req.query.format = req.query.format || "xlsx"; return ctrl.getCollectionReport(req, res, next); });

router.get("/outstanding", canAccess, ctrl.getOutstandingReport);
router.get("/outstanding/export", canAccess, (req, res, next) => { req.query.format = req.query.format || "xlsx"; return ctrl.getOutstandingReport(req, res, next); });

router.get("/concessions", canAccess, ctrl.getConcessionsReport);
router.get("/concessions/export", canAccess, (req, res, next) => { req.query.format = req.query.format || "xlsx"; return ctrl.getConcessionsReport(req, res, next); });

router.get("/expenses", canAccess, ctrl.getExpensesReport);
router.get("/expenses/export", canAccess, (req, res, next) => { req.query.format = req.query.format || "xlsx"; return ctrl.getExpensesReport(req, res, next); });

router.get("/profit-loss", canAccess, ctrl.getProfitLossReport);
router.get("/profit-loss/export", canAccess, (req, res, next) => { req.query.format = req.query.format || "xlsx"; return ctrl.getProfitLossReport(req, res, next); });

router.get("/budget-vs-actual", canAccess, ctrl.getBudgetVsActualReport);
router.get("/budget-vs-actual/export", canAccess, (req, res, next) => { req.query.format = req.query.format || "xlsx"; return ctrl.getBudgetVsActualReport(req, res, next); });

router.get("/collection-efficiency", canAccess, ctrl.getCollectionEfficiencyReport);
router.get("/collection-efficiency/export", canAccess, (req, res, next) => { req.query.format = req.query.format || "xlsx"; return ctrl.getCollectionEfficiencyReport(req, res, next); });

module.exports = router;
