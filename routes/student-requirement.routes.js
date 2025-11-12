const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/decode.token");
const upload = require("../middlewares/upload");
const studentRequirementController = require("../controllers/student-requirement.controller");

// Get all requirements for a student's internship (student view)
router.get(
	"/student-internship/:student_internship_id",
	authMiddleware,
	studentRequirementController.getStudentRequirements
);

// Submit or update a requirement (student)
router.post(
	"/student-internship/:student_internship_id/requirement/:ojt_requirement_id",
	authMiddleware,
	upload.single("file"),
	studentRequirementController.submitRequirement
);

// Review a requirement (coordinator only)
router.patch(
	"/:student_requirement_id/review",
	authMiddleware,
	studentRequirementController.reviewRequirement
);

// Get all requirements for review (coordinator)
router.get(
	"/review",
	authMiddleware,
	studentRequirementController.getRequirementsForReview
);

// Student: Start OJT (change status to ongoing)
router.post(
	"/student-internship/:student_internship_id/start-ojt",
	authMiddleware,
	studentRequirementController.startOJT
);

// Student: Finalize post-OJT (change status to completed)
router.post(
	"/student-internship/:student_internship_id/finalize-post-ojt",
	authMiddleware,
	studentRequirementController.finalizePostOJT
);

module.exports = router;

