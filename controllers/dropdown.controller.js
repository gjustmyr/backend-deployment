// controllers/department.controller.js
const db = require("../models");
const { Department, Industry, OJTCoordinator, Program, Employer } = db;

// Get enabled departments only
exports.getEnabledDepartments = async (req, res) => {
	try {
		const enabledDepartments = await Department.findAll({
			where: { status: "enabled" },
			attributes: ["department_id", "department_name", "department_abbv"],
			order: [["department_name", "ASC"]],
		});

		res.status(200).json(enabledDepartments);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Failed to fetch enabled departments" });
	}
};

// Get all industries
exports.getEnabledIndustries = async (req, res) => {
	try {
		const industries = await Industry.findAll({
			attributes: ["industry_id", "industry_name"],
			order: [["industry_name", "ASC"]],
		});
		res.status(200).json(industries);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Failed to fetch industries" });
	}
};

exports.getOJTCoordinators = async (req, res) => {
	try {
		const coordinators = await OJTCoordinator.findAll({
			where: { status: "enabled" },
			attributes: [
				"ojt_coordinator_id",
				"first_name",
				"middle_name",
				"last_name",
			],
			order: [["first_name", "ASC"]],
		});
		res.status(200).json(coordinators);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Failed to fetch OJT coordinators" });
	}
};

// Get all programs
exports.getPrograms = async (req, res) => {
	try {
		const programs = await Program.findAll({
			where: { status: "enabled" },
			attributes: ["program_id", "program_name", "program_abbv"],
			order: [["program_name", "ASC"]],
		});
		res.status(200).json(programs);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Failed to fetch programs" });
	}
};

// Get unique locations from employers (city and province)
exports.getLocations = async (req, res) => {
	try {
		const employers = await Employer.findAll({
			where: { status: "enabled" },
			attributes: ["city_address", "province_address"],
			raw: true,
		});

		// Get unique locations
		const locations = new Set();
		employers.forEach((employer) => {
			if (employer.city_address) {
				locations.add(employer.city_address);
			}
			if (employer.province_address) {
				locations.add(employer.province_address);
			}
		});

		const locationsArray = Array.from(locations)
			.filter(Boolean)
			.sort()
			.map((location) => ({ location }));

		res.status(200).json(locationsArray);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Failed to fetch locations" });
	}
};
