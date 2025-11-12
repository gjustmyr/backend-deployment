const express = require("express");
const router = express.Router();
const parser = require("../middlewares/upload");
const OJTRequirementsController = require("../controllers/ojt-requirements.controller");

// Get all
router.get("/", OJTRequirementsController.getAll);

// Create (with PDF upload)
router.post("/", parser.single("file"), OJTRequirementsController.create);

// Update (with optional PDF)
router.put(
	"/:ojt_requirement_id",
	parser.single("file"),
	OJTRequirementsController.update
);

// Toggle status
router.patch(
	"/:ojt_requirement_id/status",
	OJTRequirementsController.toggleStatus
);

module.exports = router;
