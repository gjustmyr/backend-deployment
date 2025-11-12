const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary.config");

// Only allow images
const imageFilter = (req, file, cb) => {
	if (file.mimetype && file.mimetype.startsWith("image/")) {
		cb(null, true);
	} else {
		cb(new Error("Only image files are allowed"), false);
	}
};

const storage = new CloudinaryStorage({
	cloudinary,
	params: {
		folder: "employer_logos",
		resource_type: "image",
		allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
	},
});

const upload = multer({ 
	storage, 
	fileFilter: imageFilter,
	limits: {
		fileSize: 50 * 1024 * 1024, // 50MB limit
	},
});

module.exports = upload;

