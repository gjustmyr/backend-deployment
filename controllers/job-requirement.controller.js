const db = require("../models");
const { JobRequirement, Internship, Employer, Alumni, AlumniRequirementSubmission } = db;

const sanitizeRequirementPayload = (requirements = []) => {
	if (!Array.isArray(requirements)) return [];
	return requirements
		.filter((item) => item && item.title)
		.map((item, index) => ({
			job_requirement_id: item.job_requirement_id || null,
			title: item.title,
			description: item.description || null,
			is_required: item.is_required !== undefined ? !!item.is_required : true,
			order: item.order !== undefined ? item.order : index,
		}));
};

exports.getRequirements = async (req, res) => {
	try {
		const { internship_id } = req.params;

		const internship = await Internship.findByPk(internship_id, {
			include: [{ model: JobRequirement, order: [["order", "ASC"]] }],
		});

		if (!internship || !internship.is_hiring) {
			return res.status(404).json({ message: "Job posting not found" });
		}

		let submissions = [];

		if (req.user.role === "alumni") {
			const alumni = await Alumni.findOne({ where: { user_id: req.user.user_id } });
			if (alumni) {
				submissions = await AlumniRequirementSubmission.findAll({
					where: {
						alumni_id: alumni.alumni_id,
					},
				});
			}
		}

		return res.status(200).json({
			message: "Job requirements fetched successfully",
			data: {
				requirements: internship.JobRequirements || [],
				submissions,
			},
		});
	} catch (error) {
		console.error("Error fetching job requirements:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

exports.saveRequirements = async (req, res) => {
	try {
		const { internship_id } = req.params;
		const { requirements } = req.body;

		const employer = await Employer.findOne({ where: { user_id: req.user.user_id } });
		if (!employer) {
			return res.status(404).json({ message: "Employer profile not found" });
		}

		const internship = await Internship.findOne({
			where: { internship_id, employer_id: employer.employer_id, is_hiring: true },
			include: [{ model: JobRequirement }],
		});

		if (!internship) {
			return res.status(404).json({ message: "Job posting not found" });
		}

		const sanitized = sanitizeRequirementPayload(requirements);

		// Track existing requirement IDs
		const existingIds = internship.JobRequirements.map((req) => req.job_requirement_id);
		const incomingIds = sanitized
			.filter((req) => req.job_requirement_id)
			.map((req) => req.job_requirement_id);

		// Delete removed requirements
		const toDelete = existingIds.filter((id) => !incomingIds.includes(id));
		if (toDelete.length > 0) {
			await JobRequirement.destroy({
				where: { job_requirement_id: toDelete },
			});
		}

		// Upsert requirements
		const promises = sanitized.map(async (payload) => {
			if (payload.job_requirement_id) {
				return JobRequirement.update(payload, {
					where: { job_requirement_id: payload.job_requirement_id },
				});
			}
			return JobRequirement.create({
				...payload,
				internship_id: internship.internship_id,
			});
		});

		await Promise.all(promises);

		const refreshed = await Internship.findByPk(internship.internship_id, {
			include: [{ model: JobRequirement, order: [["order", "ASC"]] }],
		});

		return res.status(200).json({
			message: "Job requirements saved successfully",
			data: refreshed.JobRequirements,
		});
	} catch (error) {
		console.error("Error saving job requirements:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

exports.submitRequirement = async (req, res) => {
	try {
		const { job_requirement_id } = req.params;

		const requirement = await JobRequirement.findByPk(job_requirement_id, {
			include: [{ model: Internship }],
		});

		if (!requirement || !requirement.Internship || !requirement.Internship.is_hiring) {
			return res.status(404).json({ message: "Job requirement not found" });
		}

		const alumni = await Alumni.findOne({ where: { user_id: req.user.user_id } });
		if (!alumni) {
			return res.status(404).json({ message: "Alumni profile not found" });
		}

		if (!req.file?.path) {
			return res.status(400).json({ message: "Document upload is required" });
		}

		const submission = await AlumniRequirementSubmission.create({
			job_requirement_id,
			job_application_id: req.body.job_application_id || null,
			alumni_id: alumni.alumni_id,
			document_url: req.file.path,
			status: "submitted",
		});

		return res.status(201).json({
			message: "Requirement submitted successfully",
			data: submission,
		});
	} catch (error) {
		console.error("Error submitting job requirement:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

exports.reviewSubmission = async (req, res) => {
	try {
		const { submission_id } = req.params;
		const { status, remarks } = req.body;

		if (!["approved", "rejected", "submitted"].includes(status)) {
			return res.status(400).json({ message: "Invalid status provided" });
		}

		const employer = await Employer.findOne({ where: { user_id: req.user.user_id } });
		if (!employer) {
			return res.status(404).json({ message: "Employer profile not found" });
		}

		const submission = await AlumniRequirementSubmission.findByPk(submission_id, {
			include: [
				{
					model: JobRequirement,
					include: [{ model: Internship }],
				},
			],
		});

		if (
			!submission ||
			!submission.JobRequirement ||
			!submission.JobRequirement.Internship ||
			submission.JobRequirement.Internship.employer_id !== employer.employer_id
		) {
			return res.status(404).json({ message: "Requirement submission not found" });
		}

		await submission.update({
			status,
			remarks: remarks ?? submission.remarks,
			reviewed_at: new Date(),
		});

		return res.status(200).json({
			message: "Requirement submission updated successfully",
			data: submission,
		});
	} catch (error) {
		console.error("Error reviewing job requirement submission:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

