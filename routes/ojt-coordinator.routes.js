const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/decode.token");
const { excelUpload } = require("../middlewares/upload");
const {
	create,
	update,
	toggleStatus,
	getAll,
	getStudentsBySection,
	addStudentsToSection,
	addStudentsFromExcel,
} = require("../controllers/ojt-coordinator.controller");

// Create a new OJT Coordinator
router.post("/", authMiddleware, create);

// Update an existing OJT Coordinator
router.put("/:ojt_coordinator_id", authMiddleware, update);

// Enable or Disable an OJT Coordinator
router.patch("/:ojt_coordinator_id/status", authMiddleware, toggleStatus);

// Get all OJT Coordinators
router.get("/", authMiddleware, getAll);

// Get students by section for current coordinator
router.get("/students-by-section", authMiddleware, getStudentsBySection);

// Add students to a section and create accounts
router.post("/add-students-to-section", authMiddleware, addStudentsToSection);

// Add students from Excel file
router.post("/add-students-from-excel", authMiddleware, excelUpload.single("excel_file"), addStudentsFromExcel);

module.exports = router;
