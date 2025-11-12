const db = require("../models");
const { Sequelize } = db;
const {
	Internship,
	Employer,
	User,
	Alumni,
	JobApplication,
	JobRequirement,
	Skill,
	InternshipSkill,
} = db;

const buildJobWhereClause = (customFilters = {}) => ({
	is_hiring: true,
	...customFilters,
});

exports.getDashboardStats = async (req, res) => {
	try {
		const [totalJobs, approvedJobs, pendingJobs, rejectedJobs] = await Promise.all([
			Internship.count({ where: buildJobWhereClause() }),
			Internship.count({ where: buildJobWhereClause({ approval_status: "approved" }) }),
			Internship.count({ where: buildJobWhereClause({ approval_status: "pending" }) }),
			Internship.count({ where: buildJobWhereClause({ approval_status: "rejected" }) }),
		]);

		const [totalAlumni, inactiveAlumni] = await Promise.all([
			User.count({ where: { role: "alumni" } }),
			User.count({ where: { role: "alumni", status: "disabled" } }),
		]);

		const jobApplicationsByStatus = await JobApplication.findAll({
			attributes: [
				"status",
				[Sequelize.fn("COUNT", Sequelize.col("job_application_id")), "count"],
			],
			group: ["status"],
			include: [
				{
					model: Internship,
					attributes: [],
					required: true,
					where: { is_hiring: true },
				},
			],
			raw: true,
		});

		const recentJobs = await Internship.findAll({
			where: buildJobWhereClause(),
			include: [
				{
					model: Employer,
					attributes: ["employer_id", "company_name", "eligibility"],
				},
				{
					model: InternshipSkill,
					include: [{ model: Skill, attributes: ["skill_id", "skill_name"] }],
				},
			],
			order: [["createdAt", "DESC"]],
			limit: 5,
		});

		return res.status(200).json({
			message: "Dashboard statistics fetched successfully",
			data: {
				totalJobs,
				approvedJobs,
				pendingJobs,
				rejectedJobs,
				totalAlumni,
				inactiveAlumni,
				jobApplicationsByStatus,
				recentJobs,
			},
		});
	} catch (error) {
		console.error("Error fetching job placement dashboard stats:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

exports.getJobApprovals = async (req, res) => {
	try {
		const { status } = req.query;

		const whereClause = buildJobWhereClause();
		if (status && ["pending", "approved", "rejected"].includes(status)) {
			whereClause.approval_status = status;
		}

		const jobs = await Internship.findAll({
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
				{
					model: JobRequirement,
				},
			],
			order: [
				["approval_status", "ASC"],
				["createdAt", "DESC"],
			],
		});

		return res.status(200).json({
			message: "Job listings fetched successfully",
			data: jobs,
		});
	} catch (error) {
		console.error("Error fetching job approvals:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

exports.getAlumni = async (req, res) => {
	try {
		const alumniUsers = await User.findAll({
			where: { role: "alumni" },
			attributes: ["user_id", "email", "status", "createdAt"],
			include: [
				{
					model: Alumni,
					attributes: [
						"alumni_id",
						"first_name",
						"middle_name",
						"last_name",
						"contact_number",
						"current_position",
						"company_name",
						"linked_in_url",
						"resume_url",
						"verified_at",
					],
				},
			],
			order: [["createdAt", "DESC"]],
		});

		return res.status(200).json({
			message: "Alumni fetched successfully",
			data: alumniUsers,
		});
	} catch (error) {
		console.error("Error fetching alumni:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

exports.updateAlumniStatus = async (req, res) => {
	try {
		const { user_id } = req.params;
		const { status } = req.body;

		if (!["enabled", "disabled"].includes(status)) {
			return res.status(400).json({ message: "Invalid status value" });
		}

		const user = await User.findOne({
			where: { user_id, role: "alumni" },
			include: [{ model: Alumni }],
		});

		if (!user) {
			return res.status(404).json({ message: "Alumni account not found" });
		}

		await user.update({ status });

		if (status === "enabled" && user.Alumni && !user.Alumni.verified_at) {
			await user.Alumni.update({ verified_at: new Date() });
		}

		const refreshedUser = await User.findOne({
			where: { user_id },
			attributes: ["user_id", "email", "status", "role"],
			include: [{ model: Alumni }],
		});

		return res.status(200).json({
			message: "Alumni status updated successfully",
			data: refreshedUser,
		});
	} catch (error) {
		console.error("Error updating alumni status:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

