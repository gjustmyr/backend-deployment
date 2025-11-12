// routes/department.routes.js
const express = require("express");
const {
	getEnabledDepartments,
	getEnabledIndustries,
	getOJTCoordinators,
	getPrograms,
	getLocations,
} = require("../controllers/dropdown.controller");
const router = express.Router();

router.get("/departments", getEnabledDepartments);
router.get("/industries", getEnabledIndustries);
router.get("/ojt-coordinators", getOJTCoordinators);
router.get("/programs", getPrograms);
router.get("/locations", getLocations);

module.exports = router;
