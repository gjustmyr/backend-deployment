const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/decode.token");
const upload = require("../middlewares/upload");
const {
	getRequirements,
	saveRequirements,
	submitRequirement,
	reviewSubmission,
} = require("../controllers/job-requirement.controller");

const ensureEmployer = (req, res, next) => {
	if (!req.user || req.user.role !== "employer") {
		return res.status(403).json({ message: "Access denied" });
	}
	next();
};

const ensureAlumni = (req, res, next) => {
	if (!req.user || req.user.role !== "alumni") {
		return res.status(403).json({ message: "Access denied" });
	}
	next();
};

router.get("/:internship_id", authMiddleware, getRequirements);
router.put(
	"/:internship_id",
	authMiddleware,
	ensureEmployer,
	saveRequirements
);

router.post(
	"/submit/:job_requirement_id",
	authMiddleware,
	ensureAlumni,
	upload.single("document"),
	submitRequirement
);

router.patch(
	"/submission/:submission_id/status",
	authMiddleware,
	ensureEmployer,
	reviewSubmission
);

module.exports = router;

