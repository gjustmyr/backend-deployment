const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/decode.token");
const {
	getDashboardStats,
	getJobApprovals,
	getAlumni,
	updateAlumniStatus,
} = require("../controllers/job-placement.controller");

const ensureJobPlacementHead = (req, res, next) => {
	if (!req.user || req.user.role !== "job-placement-head") {
		return res.status(403).json({ message: "Access denied" });
	}
	next();
};

// All routes require authentication as job placement head
router.use(authMiddleware, ensureJobPlacementHead);

router.get("/dashboard", getDashboardStats);
router.get("/jobs", getJobApprovals);

router.get("/alumni", getAlumni);
router.patch("/alumni/:user_id/status", updateAlumniStatus);

module.exports = router;

