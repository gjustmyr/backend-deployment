const express = require("express");
const router = express.Router();
const SectionController = require("../controllers/section.controller");

router.get(
	"/by-coordinator/:coordinator_id",
	SectionController.getSectionsByCoordinator
);

module.exports = router;
