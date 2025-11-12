const db = require("../models");
const OJTRequirements = db.OJTRequirement;
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

// Create a new OJT Requirement with PDF upload
exports.create = async (req, res) => {
	try {
		const { requirement_name, type } = req.body;

		if (!requirement_name || !type || !req.file) {
			return res.status(400).json({
				message: "All required fields (name, type, PDF) must be provided.",
			});
		}

		// Check for duplicate requirement name or document URL
		const existing = await OJTRequirements.findOne({
			where: {
				[Op.or]: [{ requirement_name }, { document_url: req.file.path }],
			},
		});

		if (existing) {
			return res.status(409).json({
				message: "Requirement name or document URL already exists.",
			});
		}

		const requirement = await OJTRequirements.create({
			requirement_name,
			type,
			document_url: req.file.path,
		});

		return res.status(201).json({
			message: "OJT Requirement created successfully.",
			data: requirement,
		});
	} catch (error) {
		console.error("Error creating OJT Requirement:", error);
		res
			.status(500)
			.json({ message: "Internal Server Error", error: error.message });
	}
};

// Update an existing OJT Requirement
exports.update = async (req, res) => {
	try {
		const { ojt_requirement_id } = req.params;
		const { requirement_name, type, status } = req.body;

		const requirement = await OJTRequirements.findByPk(ojt_requirement_id);
		if (!requirement) {
			return res.status(404).json({ message: "OJT Requirement not found." });
		}

		let document_url = requirement.document_url;
		if (req.file) {
			document_url = req.file.path; // Replace PDF if new file uploaded
		}

		await requirement.update({
			requirement_name: requirement_name || requirement.requirement_name,
			type: type || requirement.type,
			status: status || requirement.status,
			document_url,
		});

		return res.status(200).json({
			message: "OJT Requirement updated successfully.",
			data: requirement,
		});
	} catch (error) {
		console.error("Error updating OJT Requirement:", error);
		res
			.status(500)
			.json({ message: "Internal Server Error", error: error.message });
	}
};

// Toggle status (active → expired → terminated → active)
exports.toggleStatus = async (req, res) => {
	try {
		const { ojt_requirement_id } = req.params;

		const requirement = await OJTRequirements.findByPk(ojt_requirement_id);
		if (!requirement) {
			return res.status(404).json({ message: "OJT Requirement not found." });
		}

		let newStatus;
		if (requirement.status === "active") newStatus = "expired";
		else if (requirement.status === "expired") newStatus = "terminated";
		else newStatus = "active";

		await requirement.update({ status: newStatus });

		return res.status(200).json({
			message: `OJT Requirement status changed to ${newStatus}.`,
			data: requirement,
		});
	} catch (error) {
		console.error("Error toggling OJT Requirement status:", error);
		res
			.status(500)
			.json({ message: "Internal Server Error", error: error.message });
	}
};

// Get all OJT Requirements (with optional type/status filter)
exports.getAll = async (req, res) => {
	try {
		const { type, status, search } = req.query;

		// Build the where clause
		const whereClause = {};
		if (type) whereClause.type = type;
		if (status) whereClause.status = status;
		if (search) {
			whereClause.requirement_name = {
				[Op.iLike]: `%${search}%`, // PostgreSQL case-insensitive search
			};
		}

		const requirements = await OJTRequirements.findAll({
			where: whereClause,
			order: [["createdAt", "DESC"]],
		});

		return res.status(200).json({
			message: "OJT Requirements retrieved successfully.",
			count: requirements.length,
			data: requirements,
		});
	} catch (error) {
		console.error("Error fetching OJT Requirements:", error);
		res
			.status(500)
			.json({ message: "Internal Server Error", error: error.message });
	}
};
// Get a single OJT Requirement by ID
exports.getOne = async (req, res) => {
	try {
		const { ojt_requirement_id } = req.params;

		const requirement = await OJTRequirements.findByPk(ojt_requirement_id);
		if (!requirement) {
			return res.status(404).json({ message: "OJT Requirement not found." });
		}

		return res.status(200).json({
			message: "OJT Requirement retrieved successfully.",
			data: requirement,
		});
	} catch (error) {
		console.error("Error fetching OJT Requirement:", error);
		res
			.status(500)
			.json({ message: "Internal Server Error", error: error.message });
	}
};
