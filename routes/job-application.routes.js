const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/decode.token");
const upload = require("../middlewares/upload");
const {
	apply,
	getMyApplications,
	getByJobForEmployer,
	updateStatus,
} = require("../controllers/job-application.controller");

const ensureAlumni = (req, res, next) => {
	if (!req.user || req.user.role !== "alumni") {
		return res.status(403).json({ message: "Access denied" });
	}
	next();
};

const ensureEmployer = (req, res, next) => {
	if (!req.user || req.user.role !== "employer") {
		return res.status(403).json({ message: "Access denied" });
	}
	next();
};

router.post(
	"/",
	authMiddleware,
	ensureAlumni,
	upload.single("resume"),
	apply
);

router.get("/my", authMiddleware, ensureAlumni, getMyApplications);

router.get(
	"/job/:internship_id",
	authMiddleware,
	ensureEmployer,
	getByJobForEmployer
);

router.patch(
	"/:job_application_id/status",
	authMiddleware,
	ensureEmployer,
	updateStatus
);

module.exports = router;

