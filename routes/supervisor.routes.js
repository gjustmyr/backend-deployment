const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/decode.token");
const uploadImage = require("../middlewares/uploadImage");
const uploadPdf = require("../middlewares/upload");
const {
	getCurrentProfile,
	updateCurrentProfile,
	getMyInterns,
	getCompanyInternships,
	create,
	getByEmployer,
	update,
	toggleStatus,
	getInternAttendance,
	verifyAttendance,
	modifyAttendance,
	submitAppraisalReport,
	markInternshipAsDone,
} = require("../controllers/supervisor.controller");

// Supervisor routes (for supervisor users)
router.get("/profile", authMiddleware, getCurrentProfile);
router.put("/profile", authMiddleware, uploadImage.single("profile_picture"), updateCurrentProfile);
router.get("/interns", authMiddleware, getMyInterns);
router.get("/internships", authMiddleware, getCompanyInternships);
router.get("/intern/:student_internship_id/attendance", authMiddleware, getInternAttendance);
router.patch("/attendance/:attendance_id/verify", authMiddleware, verifyAttendance);
router.put("/attendance/:attendance_id/modify", authMiddleware, modifyAttendance);
router.post(
	"/intern/:student_internship_id/appraisal",
	authMiddleware,
	uploadPdf.single("appraisal_report"),
	submitAppraisalReport
);
router.post(
	"/intern/:student_internship_id/mark-done",
	authMiddleware,
	markInternshipAsDone
);

// Employer routes (for creating/managing supervisors)
router.post("/", authMiddleware, create);
router.get("/employer", authMiddleware, getByEmployer);
router.put("/:supervisor_id", authMiddleware, update);
router.patch("/:supervisor_id/status", authMiddleware, toggleStatus);

module.exports = router;

