const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/decode.token");
const uploadImage = require("../middlewares/uploadImage");
const {
	getCurrentProfile,
	updateCurrentProfile,
} = require("../controllers/student-trainee.controller");

// Get current student trainee profile
router.get("/profile", authMiddleware, getCurrentProfile);

// Update current student trainee profile
router.put("/profile", authMiddleware, uploadImage.single("profile_picture"), updateCurrentProfile);

module.exports = router;

