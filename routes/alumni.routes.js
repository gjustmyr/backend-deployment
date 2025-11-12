const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/decode.token");
const upload = require("../middlewares/upload");
const {
	register,
	getCurrentProfile,
	updateCurrentProfile,
} = require("../controllers/alumni.controller");

// Public registration route
router.post("/register", register);

// Protected profile routes
router.get("/profile", authMiddleware, getCurrentProfile);
router.put(
	"/profile",
	authMiddleware,
	upload.single("resume"),
	updateCurrentProfile
);

module.exports = router;

