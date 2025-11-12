const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/decode.token");
const ojtHeadController = require("../controllers/ojt-head.controller");

// Register OJT Head (admin only)
router.post("/register", ojtHeadController.registerOJTHead);

// Get dashboard statistics (OJT Head view)
router.get(
	"/dashboard/stats",
	authMiddleware,
	ojtHeadController.getDashboardStats
);

// Get filter options for dashboard (academic years and semestrals)
router.get(
	"/dashboard/filter-options",
	authMiddleware,
	ojtHeadController.getFilterOptions
);

module.exports = router;
