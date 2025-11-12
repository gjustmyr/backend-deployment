const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/decode.token");
const studentInternshipController = require("../controllers/student-internship.controller");

// Get current student's internship
router.get("/my-internship", authMiddleware, studentInternshipController.getMyStudentInternship);

module.exports = router;

