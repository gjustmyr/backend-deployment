const db = require("../models");
const Section = db.Section;
const Program = db.Program;
const OJTCoordinator = db.OJTCoordinator;

// Get sections filtered by OJT Coordinator department
exports.getSectionsByCoordinator = async (req, res) => {
	try {
		const { coordinator_id } = req.params;

		// Find coordinator
		const coordinator = await OJTCoordinator.findOne({
			where: { ojt_coordinator_id: coordinator_id },
		});

		if (!coordinator) {
			return res.status(404).json({ message: "Coordinator not found" });
		}

		// Find all programs in the coordinator's department
		const programs = await Program.findAll({
			where: { department_id: coordinator.department_id },
			attributes: ["program_id"],
		});

		const programIds = programs.map((p) => p.program_id);

		// Find all sections in these programs
		const sections = await Section.findAll({
			where: { program_id: programIds, status: "enabled" },
			order: [["section_name", "ASC"]],
		});

		return res.json(sections);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Failed to fetch sections", error });
	}
};
