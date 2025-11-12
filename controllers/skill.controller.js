const db = require("../models");
const { Skill } = db;

// Get all skills
exports.getAll = async (req, res) => {
	try {
		const skills = await Skill.findAll({
			order: [["skill_name", "ASC"]],
		});

		res.status(200).json({
			message: "Skills fetched successfully",
			data: skills,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

// Create or get skill (auto-add if not exists)
exports.createOrGet = async (req, res) => {
	try {
		const { skill_name, skill_description } = req.body;

		if (!skill_name || !skill_name.trim()) {
			return res.status(400).json({ message: "Skill name is required" });
		}

		// Try to find existing skill (case-insensitive)
		let skill = await Skill.findOne({
			where: {
				skill_name: {
					[db.Sequelize.Op.iLike]: skill_name.trim(),
				},
			},
		});

		let wasCreated = false;
		// If skill doesn't exist, create it
		if (!skill) {
			skill = await Skill.create({
				skill_name: skill_name.trim(),
				skill_description: skill_description?.trim() || null,
			});
			wasCreated = true;
		}

		res.status(200).json({
			message: wasCreated ? "Skill created successfully" : "Skill found",
			data: skill,
		});
	} catch (err) {
		console.error(err);
		// Handle unique constraint violation
		if (err.name === "SequelizeUniqueConstraintError") {
			// Try to get the existing skill
			const existingSkill = await Skill.findOne({
				where: {
					skill_name: {
						[db.Sequelize.Op.iLike]: skill_name.trim(),
					},
				},
			});
			if (existingSkill) {
				return res.status(200).json({
					message: "Skill found",
					data: existingSkill,
				});
			}
		}
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

// Create a new skill
exports.create = async (req, res) => {
	try {
		const { skill_name, skill_description } = req.body;

		if (!skill_name || !skill_name.trim()) {
			return res.status(400).json({ message: "Skill name is required" });
		}

		const skill = await Skill.create({
			skill_name: skill_name.trim(),
			skill_description: skill_description?.trim() || null,
		});

		res.status(201).json({
			message: "Skill created successfully",
			data: skill,
		});
	} catch (err) {
		console.error(err);
		if (err.name === "SequelizeUniqueConstraintError") {
			return res.status(400).json({ message: "Skill already exists" });
		}
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

