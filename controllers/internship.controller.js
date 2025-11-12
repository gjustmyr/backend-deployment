const db = require("../models");
const { Internship, Employer, StudentInternship, StudentTrainee, Supervisor, User, InternshipSkill, Skill } = db;

// Create internship posting
exports.create = async (req, res) => {
	try {
		const { title, description, is_hiring, skill_ids } = req.body;

		// Get current employer
		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!employer) {
			return res.status(404).json({ message: "Employer not found" });
		}

		const internship = await Internship.create({
			title,
			description,
			employer_id: employer.employer_id,
			is_hiring: is_hiring === "true" || is_hiring === true,
			status: "enabled",
			approval_status: "pending", // New internships need OJT Head approval
		});

		// Handle skills if provided
		if (skill_ids && Array.isArray(skill_ids) && skill_ids.length > 0) {
			// Filter out invalid skill_ids and create InternshipSkill records
			const validSkillIds = skill_ids.filter(id => id && !isNaN(parseInt(id)));
			if (validSkillIds.length > 0) {
				await Promise.all(
					validSkillIds.map(skill_id =>
						InternshipSkill.create({
							internship_id: internship.internship_id,
							skill_id: parseInt(skill_id),
						})
					)
				);
			}
		}

		// Fetch internship with skills
		const internshipWithSkills = await Internship.findByPk(internship.internship_id, {
			include: [
				{
					model: Employer,
					attributes: ["company_name", "contact_email", "contact_phone"],
				},
				{
					model: InternshipSkill,
					include: [
						{
							model: Skill,
							attributes: ["skill_id", "skill_name", "skill_description"],
						},
					],
				},
			],
		});

		res.status(201).json({
			message: "Internship posted successfully",
			data: internshipWithSkills,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

// Get all internships for current employer
exports.getMyInternships = async (req, res) => {
	try {
		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!employer) {
			return res.status(404).json({ message: "Employer not found" });
		}

		const internships = await Internship.findAll({
			where: { employer_id: employer.employer_id },
			order: [["createdAt", "DESC"]],
			include: [
				{
					model: Employer,
					attributes: ["company_name", "contact_person", "contact_email", "contact_phone"],
				},
				{
					model: InternshipSkill,
					include: [
						{
							model: Skill,
							attributes: ["skill_id", "skill_name", "skill_description"],
						},
					],
				},
			],
		});

		res.status(200).json({
			message: "Internships fetched successfully",
			data: internships,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

// Get applications for an internship
exports.getApplications = async (req, res) => {
	try {
		const { internship_id } = req.params;

		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!employer) {
			return res.status(404).json({ message: "Employer not found" });
		}

		const internship = await Internship.findOne({
			where: {
				internship_id,
				employer_id: employer.employer_id,
			},
		});

		if (!internship) {
			return res.status(404).json({ message: "Internship not found" });
		}

		// Get student internships that are related to this employer's supervisors
		// For now, we'll get all student internships and filter by supervisor's employer
		const applications = await StudentInternship.findAll({
			include: [
				{
					model: StudentTrainee,
					attributes: [
						"student_trainee_id",
						"first_name",
						"middle_name",
						"last_name",
						"prefix_name",
						"suffix_name",
					],
					include: [
						{
							model: db.User,
							attributes: ["email"],
						},
					],
				},
				{
					model: Supervisor,
					where: { employer_id: employer.employer_id },
					attributes: ["supervisor_id", "first_name", "last_name"],
					required: true,
				},
			],
			order: [["createdAt", "DESC"]],
		});

		res.status(200).json({
			message: "Applications fetched successfully",
			data: applications,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

// Update application status
exports.updateApplicationStatus = async (req, res) => {
	try {
		const { application_id } = req.params;
		const { status } = req.body;

		const validStatuses = [
			"application_seen",
			"hired",
			"starting",
			"pre-ojt",
			"ongoing",
			"completed",
			"dropped",
		];

		if (!validStatuses.includes(status)) {
			return res.status(400).json({ message: "Invalid status" });
		}

		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!employer) {
			return res.status(404).json({ message: "Employer not found" });
		}

		const application = await StudentInternship.findByPk(application_id, {
			include: [
				{
					model: Supervisor,
					where: { employer_id: employer.employer_id },
					required: true,
				},
			],
		});

		if (!application) {
			return res.status(404).json({ message: "Application not found" });
		}

		// Check requirements before allowing status change to "ongoing"
		if (status === "ongoing") {
			const studentRequirementController = require("./student-requirement.controller");
			const requirementsCheck = await studentRequirementController.checkRequirementsStatus(
				application_id,
				"pre-ojt"
			);

			if (!requirementsCheck.allApproved) {
				return res.status(400).json({
					message: "Cannot change status to ongoing. Not all pre-OJT requirements are approved.",
					data: {
						missingRequirements: requirementsCheck.missingRequirements,
					},
				});
			}
		}

		// If status is changed to "completed", automatically set to "post-ojt" status
		// and check if post-OJT requirements need to be submitted
		if (status === "completed") {
			// Check if there are post-OJT requirements
			const { OJTRequirement } = db;
			const postOJTRequirements = await OJTRequirement.findAll({
				where: {
					type: "post-ojt",
					status: "active",
				},
			});

			if (postOJTRequirements.length > 0) {
				// Set status to "post-ojt" instead of "completed"
				await application.update({ status: "post-ojt" });

				return res.status(200).json({
					message: "OJT completed. Please submit post-OJT requirements to finalize.",
					data: application,
					requiresPostOJTRequirements: true,
				});
			}
		}

		await application.update({ status });

		res.status(200).json({
			message: "Application status updated successfully",
			data: application,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

// Get all internships for OJT Head approval
exports.getAllForApproval = async (req, res) => {
	try {
		const internships = await Internship.findAll({
			include: [
				{
					model: Employer,
					attributes: [
						"employer_id",
						"company_name",
						"contact_person",
						"contact_email",
						"contact_phone",
						"company_overview",
					],
					include: [
						{
							model: User,
							attributes: ["email", "profile_picture"],
						},
					],
				},
			],
			order: [
				["approval_status", "ASC"], // pending first
				["createdAt", "DESC"],
			],
		});

		res.status(200).json({
			message: "Internships fetched successfully",
			data: internships,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

// Approve or reject internship
exports.updateApprovalStatus = async (req, res) => {
	try {
		const { internship_id } = req.params;
		const { approval_status } = req.body;

		const validStatuses = ["pending", "approved", "rejected"];

		if (!validStatuses.includes(approval_status)) {
			return res.status(400).json({ message: "Invalid approval status" });
		}

		const internship = await Internship.findByPk(internship_id);

		if (!internship) {
			return res.status(404).json({ message: "Internship not found" });
		}

		await internship.update({ approval_status });

		const updatedInternship = await Internship.findByPk(internship_id, {
			include: [
				{
					model: Employer,
					attributes: [
						"employer_id",
						"company_name",
						"contact_person",
						"contact_email",
						"contact_phone",
						"company_overview",
					],
					include: [
						{
							model: User,
							attributes: ["email", "profile_picture"],
						},
					],
				},
			],
		});

		res.status(200).json({
			message: `Internship ${approval_status} successfully`,
			data: updatedInternship,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

// Update internship
exports.update = async (req, res) => {
	try {
		const { internship_id } = req.params;
		const { title, description, is_hiring, skill_ids } = req.body;

		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!employer) {
			return res.status(404).json({ message: "Employer not found" });
		}

		const internship = await Internship.findOne({
			where: {
				internship_id,
				employer_id: employer.employer_id,
			},
		});

		if (!internship) {
			return res.status(404).json({ message: "Internship not found" });
		}

		// Update fields
		if (title !== undefined) internship.title = title;
		if (description !== undefined) internship.description = description;
		if (is_hiring !== undefined)
			internship.is_hiring = is_hiring === "true" || is_hiring === true;
		
		// If updating, reset approval status to pending
		internship.approval_status = "pending";

		await internship.save();

		// Handle skills update if provided
		if (skill_ids !== undefined) {
			// Delete existing internship skills
			await InternshipSkill.destroy({
				where: { internship_id: internship.internship_id },
			});

			// Add new skills if provided
			if (Array.isArray(skill_ids) && skill_ids.length > 0) {
				const validSkillIds = skill_ids.filter(id => id && !isNaN(parseInt(id)));
				if (validSkillIds.length > 0) {
					await Promise.all(
						validSkillIds.map(skill_id =>
							InternshipSkill.create({
								internship_id: internship.internship_id,
								skill_id: parseInt(skill_id),
							})
						)
					);
				}
			}
		}

		const updatedInternship = await Internship.findByPk(internship_id, {
			include: [
				{
					model: Employer,
					attributes: ["company_name", "contact_email", "contact_phone"],
				},
				{
					model: InternshipSkill,
					include: [
						{
							model: Skill,
							attributes: ["skill_id", "skill_name", "skill_description"],
						},
					],
				},
			],
		});

		res.status(200).json({
			message: "Internship updated successfully",
			data: updatedInternship,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

// Delete internship
exports.delete = async (req, res) => {
	try {
		const { internship_id } = req.params;

		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!employer) {
			return res.status(404).json({ message: "Employer not found" });
		}

		const internship = await Internship.findOne({
			where: {
				internship_id,
				employer_id: employer.employer_id,
			},
		});

		if (!internship) {
			return res.status(404).json({ message: "Internship not found" });
		}

		await internship.destroy();

		res.status(200).json({
			message: "Internship deleted successfully",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

// Toggle internship status (close/open)
exports.toggleStatus = async (req, res) => {
	try {
		const { internship_id } = req.params;

		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!employer) {
			return res.status(404).json({ message: "Employer not found" });
		}

		const internship = await Internship.findOne({
			where: {
				internship_id,
				employer_id: employer.employer_id,
			},
		});

		if (!internship) {
			return res.status(404).json({ message: "Internship not found" });
		}

		// Toggle status
		internship.status = internship.status === "enabled" ? "disabled" : "enabled";
		await internship.save();

		res.status(200).json({
			message: `Internship ${internship.status === "enabled" ? "opened" : "closed"} successfully`,
			data: internship,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

