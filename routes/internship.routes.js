const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/decode.token");
const internshipController = require("../controllers/internship.controller");

// Get my internships
router.get("/my-internships", authMiddleware, internshipController.getMyInternships);

// Create internship
router.post("/", authMiddleware, internshipController.create);

// OJT Head routes for internship approval - must come before dynamic routes
// Get all internships for approval (OJT Head only)
router.get(
	"/approvals",
	authMiddleware,
	internshipController.getAllForApproval
);

// Update application status
router.patch(
	"/applications/:application_id/status",
	authMiddleware,
	internshipController.updateApplicationStatus
);

// Update internship
router.put("/:internship_id", authMiddleware, internshipController.update);

// Delete internship
router.delete("/:internship_id", authMiddleware, internshipController.delete);

// Toggle internship status (close/open)
router.patch("/:internship_id/status", authMiddleware, internshipController.toggleStatus);

// Get applications for an internship
router.get(
	"/:internship_id/applications",
	authMiddleware,
	internshipController.getApplications
);

// Approve or reject internship (OJT Head only)
router.patch(
	"/:internship_id/approval",
	authMiddleware,
	internshipController.updateApprovalStatus
);

module.exports = router;
