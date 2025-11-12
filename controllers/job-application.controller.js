const db = require("../models");
const {
	JobApplication,
	Internship,
	Alumni,
	User,
	Employer,
	JobRequirement,
	AlumniRequirementSubmission,
	Skill,
	InternshipSkill,
} = db;

exports.apply = async (req, res) => {
	try {
		const { internship_id, cover_letter, resume_url } = req.body;

		if (!internship_id) {
			return res.status(400).json({ message: "Job posting is required" });
		}

		const alumni = await Alumni.findOne({ where: { user_id: req.user.user_id } });
		if (!alumni) {
			return res.status(404).json({ message: "Alumni profile not found" });
		}

		const internship = await Internship.findOne({
			where: { internship_id, is_hiring: true, approval_status: "approved" },
			include: [{ model: Employer }],
		});

		if (!internship) {
			return res.status(404).json({
				message: "Job posting not found or not yet approved",
			});
		}

		const existingApplication = await JobApplication.findOne({
			where: {
				internship_id,
				alumni_id: alumni.alumni_id,
			},
		});

		if (existingApplication) {
			return res.status(409).json({
				message: "You have already applied to this job posting",
			});
		}

		const application = await JobApplication.create({
			internship_id,
			alumni_id: alumni.alumni_id,
			cover_letter: cover_letter || null,
			resume_url: resume_url || null,
			status: "applied",
		});

		const createdApplication = await JobApplication.findByPk(application.job_application_id, {
			include: [
				{
					model: Internship,
					include: [
						{
							model: Employer,
							attributes: ["company_name", "contact_email", "contact_person"],
						},
						{
							model: InternshipSkill,
							include: [{ model: Skill, attributes: ["skill_id", "skill_name"] }],
						},
						{
							model: JobRequirement,
						},
					],
				},
			],
		});

		return res.status(201).json({
			message: "Job application submitted successfully",
			data: createdApplication,
		});
	} catch (error) {
		console.error("Error submitting job application:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

exports.getMyApplications = async (req, res) => {
	try {
		const alumni = await Alumni.findOne({ where: { user_id: req.user.user_id } });
		if (!alumni) {
			return res.status(404).json({ message: "Alumni profile not found" });
		}

		const applications = await JobApplication.findAll({
			where: { alumni_id: alumni.alumni_id },
			include: [
				{
					model: Internship,
					include: [
						{
							model: Employer,
							attributes: ["company_name", "contact_email", "contact_person"],
						},
						{
							model: InternshipSkill,
							include: [{ model: Skill, attributes: ["skill_id", "skill_name"] }],
						},
						{
							model: JobRequirement,
							include: [
								{
									model: AlumniRequirementSubmission,
									where: { alumni_id: alumni.alumni_id },
									required: false,
								},
							],
						},
					],
				},
			],
			order: [["createdAt", "DESC"]],
		});

		return res.status(200).json({
			message: "Job applications fetched successfully",
			data: applications,
		});
	} catch (error) {
		console.error("Error fetching alumni job applications:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

exports.getByJobForEmployer = async (req, res) => {
	try {
		const { internship_id } = req.params;

		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!employer) {
			return res.status(404).json({ message: "Employer profile not found" });
		}

		const jobPosting = await Internship.findOne({
			where: {
				internship_id,
				employer_id: employer.employer_id,
				is_hiring: true,
			},
		});

		if (!jobPosting) {
			return res.status(404).json({ message: "Job posting not found" });
		}

		const applications = await JobApplication.findAll({
			where: { internship_id },
			include: [
				{
					model: Alumni,
					include: [
						{
							model: User,
							attributes: ["email", "status"],
						},
					],
				},
				{
					model: AlumniRequirementSubmission,
					required: false,
				},
				{
					model: Internship,
					include: [
						{
							model: JobRequirement,
						},
					],
				},
			],
			order: [["createdAt", "DESC"]],
		});

		return res.status(200).json({
			message: "Job applications fetched successfully",
			data: applications,
		});
	} catch (error) {
		console.error("Error fetching job applications for employer:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

exports.updateStatus = async (req, res) => {
	try {
		const { job_application_id } = req.params;
		const { status, notes } = req.body;

		const validStatuses = [
			"applied",
			"under_review",
			"requirements_pending",
			"interview",
			"hired",
			"rejected",
		];

		if (!validStatuses.includes(status)) {
			return res.status(400).json({ message: "Invalid status provided" });
		}

		const employer = await Employer.findOne({ where: { user_id: req.user.user_id } });
		if (!employer) {
			return res.status(404).json({ message: "Employer profile not found" });
		}

		const application = await JobApplication.findByPk(job_application_id, {
			include: [{ model: Internship }],
		});

		if (!application || application.Internship.employer_id !== employer.employer_id) {
			return res.status(404).json({ message: "Job application not found" });
		}

		await application.update({
			status,
			notes: notes ?? application.notes,
		});

		const updatedApplication = await JobApplication.findByPk(job_application_id, {
			include: [
				{
					model: Alumni,
					include: [{ model: User, attributes: ["email", "status"] }],
				},
			],
		});

		return res.status(200).json({
			message: "Application status updated successfully",
			data: updatedApplication,
		});
	} catch (error) {
		console.error("Error updating job application status:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

