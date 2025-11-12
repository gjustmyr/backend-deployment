const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/decode.token");
const employerController = require("../controllers/employer.controller");
const parser = require("../middlewares/upload");
const imageParser = parser.imageUpload;

// Get all employers
router.get("/", employerController.getAll);

// Create employer (with Cloudinary PDF upload) - requires authentication to identify creator role
router.post("/", authMiddleware, parser.single("moa_file"), employerController.create);

// Profile routes - must come before /:id routes to avoid route conflicts
// Get current employer profile
router.get(
	"/profile",
	authMiddleware,
	employerController.getCurrentProfile
);

// Update current employer profile (with optional profile picture upload)
router.put(
	"/profile",
	authMiddleware,
	(req, res, next) => {
		// Handle optional file upload
		imageParser.single("profile_picture")(req, res, (err) => {
			// If LIMIT_UNEXPECTED_FILE error, file is optional - continue without it
			if (err && err.name === "MulterError" && err.code === "LIMIT_UNEXPECTED_FILE") {
				req.file = undefined;
				return next();
			}
			// For file size errors, return error
			if (err && err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
				return res.status(400).json({
					message: "File too large. Maximum size is 50MB.",
				});
			}
			// For other errors, pass to error handler
			if (err) return next(err);
			next();
		});
	},
	employerController.updateCurrentProfile
);

// Update employer (optional PDF) - dynamic route must come after static routes
router.put("/:id", parser.single("moa_file"), employerController.update);

// Toggle status
router.patch("/:id/status", employerController.toggleStatus);

module.exports = router;
