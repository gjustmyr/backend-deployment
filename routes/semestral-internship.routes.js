const express = require("express");
const router = express.Router();
const semestralController = require("../controllers/semestral-internship.controller");
const sectionController = require("../controllers/section.controller"); // For fetching sections by coordinator

// Semestral Internships
router.get("/", semestralController.getAll); // GET all internships
router.post("/", semestralController.create); // CREATE internship
router.put("/:id", semestralController.update); // UPDATE internship
router.patch("/toggle-status/:id", semestralController.toggleStatus); // TOGGLE status

// Sections filtered by coordinator
router.get(
	"/sections/:coordinator_id",
	sectionController.getSectionsByCoordinator
);

module.exports = router;
