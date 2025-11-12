const db = require("../models");
const SemestralInternship = db.SemestralInternship;
const SemestralInternshipListing = db.SemestralInternshipListing;
const OJTCoordinator = db.OJTCoordinator;
const Section = db.Section;

// Fetch all internships with nested listings
exports.getAll = async (req, res) => {
	try {
		const internships = await SemestralInternship.findAll({
			include: [
				{
					model: SemestralInternshipListing,
					as: "semestral_internship_listings",
					include: [
						{
							model: OJTCoordinator,
							attributes: ["ojt_coordinator_id", "first_name", "last_name"],
						},
						{
							model: Section,
							attributes: ["section_id", "section_name"],
						},
					],
					attributes: ["ojt_coordinator_id", "section_id"],
				},
			],
			order: [["createdAt", "DESC"]],
		});
		res.json(internships);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to fetch internships" });
	}
};

exports.create = async (req, res) => {
	try {
		const { academic_year, semestral, listings } = req.body;
		if (!academic_year || !semestral || !listings?.length) {
			return res.status(400).json({ message: "All fields are required" });
		}

		const internship = await SemestralInternship.create({
			academic_year,
			semestral,
		});

		const listingsData = listings.map((l) => ({
			semestral_internship_id: internship.semestral_internship_id,
			ojt_coordinator_id: Number(l.ojt_coordinator_id),
			section_id: Number(l.section),
		}));

		await SemestralInternshipListing.bulkCreate(listingsData);

		res.status(201).json({ message: "Internship created successfully" });
	} catch (err) {
		console.error(err);
		res
			.status(500)
			.json({ message: "Failed to create internship", error: err.message });
	}
};

exports.update = async (req, res) => {
	try {
		const { id } = req.params;
		const { academic_year, semestral, listings } = req.body;

		const internship = await SemestralInternship.findByPk(id);
		if (!internship)
			return res.status(404).json({ message: "Internship not found" });

		await internship.update({ academic_year, semestral });

		// Delete old listings
		await SemestralInternshipListing.destroy({
			where: { semestral_internship_id: id },
		});

		// Save new listings
		const listingsData = listings.map((l) => ({
			semestral_internship_id: id,
			ojt_coordinator_id: Number(l.ojt_coordinator_id),
			section_id: Number(l.section),
		}));

		await SemestralInternshipListing.bulkCreate(listingsData);

		res.json({ message: "Internship updated successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to update internship" });
	}
};

exports.toggleStatus = async (req, res) => {
	try {
		const { id } = req.params;
		const internship = await SemestralInternship.findByPk(id);
		if (!internship)
			return res.status(404).json({ message: "Internship not found" });

		internship.status = internship.status === "opened" ? "closed" : "opened";
		await internship.save();

		res.json({ message: `Internship ${internship.status}` });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to toggle status" });
	}
};
