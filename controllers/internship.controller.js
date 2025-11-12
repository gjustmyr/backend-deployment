const db = require("../models");
const {
	Internship,
	Employer,
	StudentInternship,
	StudentTrainee,
	Supervisor,
	User,
	InternshipSkill,
	Skill,
	Industry,
	StudentSkill,
	SemestralInternshipListing,
	Section,
	Program,
	Department,
	Major,
} = db;
const { Op } = require("sequelize");
const {
	buildStudentTokens,
	buildJobTokens,
	computeCosineSimilarity,
} = require("../services/recommendation.service");

// Create internship posting
exports.create = async (req, res) => {
	try {
		const { title, description, is_hiring, skill_ids } = req.body;

		let employer_id = null;

		// If user is employer, get their employer record
		if (req.user.role === "employer") {
			const employer = await Employer.findOne({
				where: { user_id: req.user.user_id },
			});

			if (!employer) {
				return res.status(404).json({ message: "Employer not found" });
			}
			employer_id = employer.employer_id;
		}
		// If user is alumni, allow posting without employer_id (null)
		// Alumni can post OJT openings as individuals
		else if (req.user.role === "alumni") {
			employer_id = null; // Alumni postings don't require employer
		} else {
			return res.status(403).json({ message: "Only employers and alumni can post internships" });
		}

		const internship = await Internship.create({
			title,
			description,
			employer_id: employer_id,
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

// Get all internships for current employer or alumni
exports.getMyInternships = async (req, res) => {
	try {
		let whereClause = {};

		if (req.user.role === "employer") {
			const employer = await Employer.findOne({
				where: { user_id: req.user.user_id },
			});

			if (!employer) {
				return res.status(404).json({ message: "Employer not found" });
			}
			whereClause.employer_id = employer.employer_id;
		} else if (req.user.role === "alumni") {
			// Alumni can see their own postings (where employer_id is null and posted by their user)
			// For now, we'll get all alumni postings (employer_id is null)
			// In the future, you might want to add a posted_by_user_id field
			whereClause.employer_id = null;
		} else {
			return res.status(403).json({ message: "Only employers and alumni can view their internships" });
		}

		const internships = await Internship.findAll({
			where: whereClause,
			order: [["createdAt", "DESC"]],
			include: [
				{
					model: Employer,
					attributes: ["company_name", "contact_person", "contact_email", "contact_phone"],
					required: false, // Allow null employer for alumni postings
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

// Get all internships for OJT Head / Job Placement Head approval
exports.getAllForApproval = async (req, res) => {
	try {
		const role = req.user?.role;

		if (!["ojt-head", "job-placement-head"].includes(role)) {
			return res.status(403).json({ message: "Access denied" });
		}

		const whereClause = {};

		if (role === "ojt-head") {
			whereClause.is_hiring = false;
		} else if (role === "job-placement-head") {
			whereClause.is_hiring = true;
		}

		if (req.query.status && ["pending", "approved", "rejected"].includes(req.query.status)) {
			whereClause.approval_status = req.query.status;
		}

		const internships = await Internship.findAll({
			where: whereClause,
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
						"eligibility",
					],
					include: [
						{
							model: User,
							attributes: ["email", "profile_picture"],
						},
					],
				},
				{
					model: InternshipSkill,
					include: [
						{
							model: Skill,
							attributes: ["skill_id", "skill_name"],
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

		const role = req.user?.role;

		if (!["ojt-head", "job-placement-head"].includes(role)) {
			return res.status(403).json({ message: "Access denied" });
		}

		const internship = await Internship.findByPk(internship_id);

		if (!internship) {
			return res.status(404).json({ message: "Internship not found" });
		}

		if (role === "ojt-head" && internship.is_hiring) {
			return res.status(403).json({
				message: "OJT Head is not allowed to approve job postings",
			});
		}

		if (role === "job-placement-head" && !internship.is_hiring) {
			return res.status(403).json({
				message: "Job Placement Head is not allowed to approve internship postings",
			});
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
						"eligibility",
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

		let whereClause = { internship_id };

		if (req.user.role === "employer") {
			const employer = await Employer.findOne({
				where: { user_id: req.user.user_id },
			});

			if (!employer) {
				return res.status(404).json({ message: "Employer not found" });
			}
			whereClause.employer_id = employer.employer_id;
		} else if (req.user.role === "alumni") {
			whereClause.employer_id = null; // Alumni postings have null employer_id
		} else {
			return res.status(403).json({ message: "Only employers and alumni can update internships" });
		}

		const internship = await Internship.findOne({
			where: whereClause,
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
					required: false, // Allow null employer for alumni postings
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

		let whereClause = { internship_id };

		if (req.user.role === "employer") {
			const employer = await Employer.findOne({
				where: { user_id: req.user.user_id },
			});

			if (!employer) {
				return res.status(404).json({ message: "Employer not found" });
			}
			whereClause.employer_id = employer.employer_id;
		} else if (req.user.role === "alumni") {
			whereClause.employer_id = null; // Alumni postings have null employer_id
		} else {
			return res.status(403).json({ message: "Only employers and alumni can delete internships" });
		}

		const internship = await Internship.findOne({
			where: whereClause,
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

		let whereClause = { internship_id };

		if (req.user.role === "employer") {
			const employer = await Employer.findOne({
				where: { user_id: req.user.user_id },
			});

			if (!employer) {
				return res.status(404).json({ message: "Employer not found" });
			}
			whereClause.employer_id = employer.employer_id;
		} else if (req.user.role === "alumni") {
			whereClause.employer_id = null; // Alumni postings have null employer_id
		} else {
			return res.status(403).json({ message: "Only employers and alumni can toggle internship status" });
		}

		const internship = await Internship.findOne({
			where: whereClause,
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

exports.getRecommendations = async (req, res) => {
	try {
		const { search } = req.query;

		if (req.user.role !== "student-trainee") {
			return res.status(403).json({ message: "Recommendations are available to student trainees only" });
		}

		const student = await StudentTrainee.findOne({
			where: { user_id: req.user.user_id },
			include: [
				{
					model: StudentSkill,
					include: [
						{
							model: Skill,
							attributes: ["skill_id", "skill_name"],
						},
					],
				},
			],
		});

		if (!student) {
			return res.status(404).json({ message: "Student profile not found" });
		}

		const latestInternship = await StudentInternship.findOne({
			where: { student_trainee_id: student.student_trainee_id },
			include: [
				{
					model: SemestralInternshipListing,
					include: [
						{
							model: Section,
							attributes: ["section_id", "section_name"],
							include: [
								{
									model: Program,
									attributes: ["program_id", "program_name"],
									include: [
										{
											model: Department,
											attributes: ["department_id", "department_name"],
										},
									],
								},
								{
									model: Major,
									attributes: ["major_id", "major_name"],
								},
							],
						},
					],
				},
			],
			order: [["createdAt", "DESC"]],
		});

		const studentSkills = (student.StudentSkills || [])
			.map((studentSkill) => studentSkill.Skill?.skill_name)
			.filter(Boolean);
		const studentSkillSet = new Set(studentSkills.map((name) => name.toLowerCase()));

		const programName = latestInternship?.SemestralInternshipListing?.Section?.Program?.program_name || "";
		const departmentName =
			latestInternship?.SemestralInternshipListing?.Section?.Program?.Department?.department_name || "";
		const majorName = latestInternship?.SemestralInternshipListing?.Section?.Major?.major_name || "";

		const studentTokens = buildStudentTokens({
			about: student.about,
			skills: studentSkills,
			department: departmentName,
			program: programName,
			major: majorName,
		});

		const internshipWhere = {
			status: "enabled",
			approval_status: "approved",
			is_hiring: true,
		};

		if (search) {
			const likeSearch = `%${search}%`;
			internshipWhere[Op.or] = [
				{ title: { [Op.iLike]: likeSearch } },
				{ description: { [Op.iLike]: likeSearch } },
			];
		}

		const internships = await Internship.findAll({
			where: internshipWhere,
			include: [
				{
					model: Employer,
					attributes: ["employer_id", "company_name", "industry_id"],
					include: [
						{
							model: Industry,
							attributes: ["industry_id", "industry_name"],
						},
					],
				},
				{
					model: InternshipSkill,
					include: [
						{
							model: Skill,
							attributes: ["skill_id", "skill_name"],
						},
					],
				},
			],
			order: [["updatedAt", "DESC"]],
		});

		const scoredInternships = internships.map((internship) => {
			const internshipSkills = (internship.InternshipSkills || []).map((item) => ({
				skill_id: item.Skill?.skill_id,
				skill_name: item.Skill?.skill_name,
			})).filter((skill) => Boolean(skill.skill_id) && Boolean(skill.skill_name));

			const jobTokens = buildJobTokens({
				title: internship.title,
				description: internship.description,
				skills: internshipSkills.map((skill) => skill.skill_name),
				company: internship.Employer?.company_name,
				industry: internship.Employer?.Industry?.industry_name,
			});

			const score = computeCosineSimilarity(studentTokens, jobTokens);
			const matchedSkills = internshipSkills
				.filter((skill) => studentSkillSet.has(skill.skill_name.toLowerCase()))
				.map((skill) => skill.skill_name);

			return {
				internship_id: internship.internship_id,
				title: internship.title,
				description: internship.description,
				status: internship.status,
				is_hiring: internship.is_hiring,
				approval_status: internship.approval_status,
				updatedAt: internship.updatedAt,
				employer: internship.Employer
					? {
						...internship.Employer.get({ plain: true }),
						industry: internship.Employer.Industry
							? internship.Employer.Industry.get({ plain: true })
							: null,
					}
					: null,
				skills: internshipSkills,
				matched_skills: matchedSkills,
				recommendation_score: Number(score.toFixed(4)),
				is_recommended: score >= 0.2,
			};
		});

		scoredInternships.sort((a, b) => b.recommendation_score - a.recommendation_score);

		return res.status(200).json({
			message: "Recommendations generated successfully",
			data: scoredInternships,
		});
	} catch (error) {
		console.error("Recommendation error", error);
		return res.status(500).json({
			message: "Failed to generate internship recommendations",
			error: error.message,
		});
	}
};

