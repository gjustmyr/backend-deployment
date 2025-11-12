const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary.config");

// Only allow PDFs
const pdfFilter = (req, file, cb) => {
	if (file.mimetype === "application/pdf") {
		cb(null, true);
	} else {
		cb(new Error("Only PDF files are allowed"), false);
	}
};

// Only allow images
const imageFilter = (req, file, cb) => {
	if (file.mimetype && file.mimetype.startsWith("image/")) {
		cb(null, true);
	} else {
		cb(new Error("Only image files are allowed"), false);
	}
};

// PDF storage for MOA and OJT requirements
const pdfStorage = new CloudinaryStorage({
	cloudinary,
	params: {
		folder: "ojt_requirements",
		resource_type: "raw", // for PDF or other non-image files
		format: "pdf",
	},
});

// Image storage for employer logos and profile pictures
const imageStorage = new CloudinaryStorage({
	cloudinary,
	params: (req, file) => {
		// Use different folders based on field name
		const folder = file.fieldname === "profile_picture" 
			? "user_profile_pictures" 
			: "employer_logos";
		
		return {
			folder: folder,
			resource_type: "image",
			allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
		};
	},
});

// PDF upload (for MOA and OJT requirements)
const upload = multer({ storage: pdfStorage, fileFilter: pdfFilter });

// Image upload (for employer logos and profile pictures)
const imageUpload = multer({ 
	storage: imageStorage, 
	fileFilter: imageFilter,
	limits: {
		fileSize: 50 * 1024 * 1024, // 50MB limit
	},
});

// Excel file filter
const excelFilter = (req, file, cb) => {
	const allowedMimes = [
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
		"application/vnd.ms-excel", // .xls
		"application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm
	];
	
	if (allowedMimes.includes(file.mimetype) || 
		file.originalname.match(/\.(xlsx|xls)$/i)) {
		cb(null, true);
	} else {
		cb(new Error("Only Excel files (.xlsx, .xls) are allowed"), false);
	}
};

// Memory storage for Excel files (we'll parse and delete immediately)
const memoryStorage = multer.memoryStorage();

// Excel upload (for student bulk import)
const excelUpload = multer({
	storage: memoryStorage,
	fileFilter: excelFilter,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB limit
	},
});

module.exports = upload;
module.exports.imageUpload = imageUpload;
module.exports.excelUpload = excelUpload;
