const db = require("../models");
const { StudentRequirement, StudentInternship, OJTRequirement, StudentTrainee, OJTCoordinator } = db;
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

// Get all requirements for a student's internship
exports.getStudentRequirements = async (req, res) => {
	try {
		const { student_internship_id } = req.params;

		// Get student internship
		const studentInternship = await StudentInternship.findOne({
			where: { student_internship_id },
			include: [
				{
					model: StudentTrainee,
					attributes: ["student_trainee_id", "first_name", "last_name"],
				},
			],
		});

		if (!studentInternship) {
			return res.status(404).json({ message: "Student internship not found" });
		}

		// Get all active requirements (pre-ojt or post-ojt based on status)
		// Determine requirement type based on student's internship status
		let requirementType = "pre-ojt";
		if (studentInternship.status === "post-ojt") {
			requirementType = "post-ojt";
		} else if (studentInternship.status === "ongoing" || 
			studentInternship.status === "completed") {
			// Show post-ojt requirements if status is ongoing or completed
			requirementType = "post-ojt";
		} else if (studentInternship.status === "pre-ojt" || 
			studentInternship.status === "starting") {
			requirementType = "pre-ojt";
		}
		// For other statuses (hired, application_seen, etc.), default to pre-ojt

		const activeRequirements = await OJTRequirement.findAll({
			where: {
				type: requirementType,
				status: "active",
			},
		});

		// Get student's submitted requirements
		const studentRequirements = await StudentRequirement.findAll({
			where: { student_internship_id },
			include: [
				{
					model: OJTRequirement,
					attributes: ["ojt_requirement_id", "requirement_name", "type", "document_url"],
				},
				{
					model: OJTCoordinator,
					as: "reviewer",
					attributes: ["ojt_coordinator_id", "first_name", "last_name"],
					required: false,
				},
			],
		});

		// Map requirements with student submission status
		const requirementsWithStatus = activeRequirements.map((req) => {
			const studentReq = studentRequirements.find(
				(sr) => sr.ojt_requirement_id === req.ojt_requirement_id
			);

			return {
				ojt_requirement_id: req.ojt_requirement_id,
				requirement_name: req.requirement_name,
				type: req.type,
				document_url: req.document_url,
				student_requirement_id: studentReq?.student_requirement_id || null,
				submitted_document_url: studentReq?.submitted_document_url || null,
				status: studentReq?.status || "not_complied",
				remarks: studentReq?.remarks || null,
				reviewed_by: studentReq?.reviewed_by || null,
				reviewed_at: studentReq?.reviewed_at || null,
				reviewer: studentReq?.reviewer || null,
			};
		});

		// Check if all requirements are approved
		const requirementsCheck = await exports.checkRequirementsStatus(
			student_internship_id,
			requirementType
		);

		return res.status(200).json({
			message: "Student requirements retrieved successfully",
			data: {
				requirements: requirementsWithStatus,
				allApproved: requirementsCheck.allApproved,
				missingRequirements: requirementsCheck.missingRequirements,
				currentStatus: studentInternship.status,
				requirementType: requirementType,
			},
		});
	} catch (error) {
		console.error("Error fetching student requirements:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Submit or update a requirement
exports.submitRequirement = async (req, res) => {
	try {
		const { student_internship_id, ojt_requirement_id } = req.params;

		if (!req.file) {
			return res.status(400).json({ message: "PDF file is required" });
		}

		// Get student internship
		const studentInternship = await StudentInternship.findOne({
			where: { student_internship_id },
			include: [
				{
					model: StudentTrainee,
					attributes: ["student_trainee_id", "user_id"],
				},
			],
		});

		if (!studentInternship) {
			return res.status(404).json({ message: "Student internship not found" });
		}

		// Verify student owns this internship
		if (req.user.role === "student-trainee" && 
			studentInternship.student_trainee.user_id !== req.user.user_id) {
			return res.status(403).json({ message: "Access denied" });
		}

		// Verify requirement exists and is active
		const requirement = await OJTRequirement.findOne({
			where: {
				ojt_requirement_id,
				status: "active",
			},
		});

		if (!requirement) {
			return res.status(404).json({ message: "Requirement not found or inactive" });
		}

		// Determine which requirement type should be allowed based on status
		const status = studentInternship.status || "application_seen";
		const allowedRequirementTypes = new Set(["pre-ojt"]);

		const postOjtStatuses = ["ongoing", "post-ojt", "completed", "graded"];
		if (postOjtStatuses.includes(status)) {
			allowedRequirementTypes.add("post-ojt");
		}

		if (!allowedRequirementTypes.has(requirement.type)) {
			return res.status(400).json({
				message: `Cannot submit ${requirement.type} requirement while status is ${status}.`,
			});
		}

		// Check if student requirement already exists
		let studentRequirement = await StudentRequirement.findOne({
			where: {
				student_internship_id,
				ojt_requirement_id,
			},
		});

		if (studentRequirement) {
			// Update existing requirement
			await studentRequirement.update({
				submitted_document_url: req.file.path,
				status: "complied", // Reset to complied when resubmitting
				remarks: null,
				reviewed_by: null,
				reviewed_at: null,
			});
		} else {
			// Create new requirement submission
			studentRequirement = await StudentRequirement.create({
				student_internship_id,
				ojt_requirement_id,
				submitted_document_url: req.file.path,
				status: "complied",
			});
		}

		return res.status(200).json({
			message: "Requirement submitted successfully",
			data: studentRequirement,
		});
	} catch (error) {
		console.error("Error submitting requirement:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Approve or reject a requirement (coordinator only)
exports.reviewRequirement = async (req, res) => {
	try {
		const { student_requirement_id } = req.params;
		const { status, remarks } = req.body;

		const validStatuses = ["approved", "need_for_resubmission"];
		if (!validStatuses.includes(status)) {
			return res.status(400).json({ 
				message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` 
			});
		}

		// Get coordinator
		const coordinator = await OJTCoordinator.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!coordinator) {
			return res.status(403).json({ message: "Only coordinators can review requirements" });
		}

		// Get student requirement
		const studentRequirement = await StudentRequirement.findOne({
			where: { student_requirement_id },
			include: [
				{
					model: StudentInternship,
					include: [
						{
							model: StudentTrainee,
							attributes: ["student_trainee_id", "first_name", "last_name"],
						},
					],
				},
			],
		});

		if (!studentRequirement) {
			return res.status(404).json({ message: "Student requirement not found" });
		}

		// Update requirement status
		await studentRequirement.update({
			status,
			remarks: remarks || null,
			reviewed_by: coordinator.ojt_coordinator_id,
			reviewed_at: new Date(),
		});

		return res.status(200).json({
			message: `Requirement ${status === "approved" ? "approved" : "marked for resubmission"}`,
			data: studentRequirement,
		});
	} catch (error) {
		console.error("Error reviewing requirement:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Check if all requirements are approved (helper function for status changes)
exports.checkRequirementsStatus = async (student_internship_id, requirementType) => {
	try {
		// Get all active requirements of the specified type
		const activeRequirements = await OJTRequirement.findAll({
			where: {
				type: requirementType,
				status: "active",
			},
		});

		if (activeRequirements.length === 0) {
			return { allApproved: true, missingRequirements: [] };
		}

		// Get student's submitted requirements
		const studentRequirements = await StudentRequirement.findAll({
			where: {
				student_internship_id,
				ojt_requirement_id: activeRequirements.map((r) => r.ojt_requirement_id),
			},
		});

		// Check if all requirements are approved
		const missingRequirements = [];
		for (const req of activeRequirements) {
			const studentReq = studentRequirements.find(
				(sr) => sr.ojt_requirement_id === req.ojt_requirement_id
			);

			if (!studentReq || studentReq.status !== "approved") {
				missingRequirements.push({
					ojt_requirement_id: req.ojt_requirement_id,
					requirement_name: req.requirement_name,
					status: studentReq?.status || "not_complied",
				});
			}
		}

		return {
			allApproved: missingRequirements.length === 0,
			missingRequirements,
		};
	} catch (error) {
		console.error("Error checking requirements status:", error);
		throw error;
	}
};

// Get all student requirements for coordinator review
exports.getRequirementsForReview = async (req, res) => {
	try {
		// Get coordinator
		const coordinator = await OJTCoordinator.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!coordinator) {
			return res.status(403).json({ message: "Only coordinators can review requirements" });
		}

		// Get all sections assigned to this coordinator
		const listings = await db.SemestralInternshipListing.findAll({
			where: { ojt_coordinator_id: coordinator.ojt_coordinator_id },
			attributes: ["semestral_internship_listing_id"],
		});

		const listingIds = listings.map((l) => l.semestral_internship_listing_id);

		// Get all student requirements that need review (complied or need_for_resubmission)
		const studentRequirements = await StudentRequirement.findAll({
			where: {
				status: {
					[Op.in]: ["complied", "need_for_resubmission"],
				},
			},
			include: [
				{
					model: StudentInternship,
					where: {
						semestral_internship_listing_id: {
							[Op.in]: listingIds,
						},
					},
					include: [
						{
							model: StudentTrainee,
							attributes: ["student_trainee_id", "first_name", "last_name", "middle_name"],
						},
					],
				},
				{
					model: OJTRequirement,
					attributes: ["ojt_requirement_id", "requirement_name", "type"],
				},
			],
			order: [["createdAt", "DESC"]],
		});

		return res.status(200).json({
			message: "Requirements for review retrieved successfully",
			data: studentRequirements,
		});
	} catch (error) {
		console.error("Error fetching requirements for review:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Student: Start OJT (change status to ongoing) - checks if all pre-OJT requirements are approved
exports.startOJT = async (req, res) => {
	try {
		const { student_internship_id } = req.params;

		// Get student internship
		const studentInternship = await StudentInternship.findOne({
			where: { student_internship_id },
			include: [
				{
					model: StudentTrainee,
					where: { user_id: req.user.user_id },
					required: true,
				},
			],
		});

		if (!studentInternship) {
			return res.status(404).json({ message: "Student internship not found" });
		}

		// Check if current status allows starting OJT
		if (studentInternship.status !== "pre-ojt" && studentInternship.status !== "starting") {
			return res.status(400).json({ 
				message: `Cannot start OJT from ${studentInternship.status} status. Current status must be pre-ojt or starting.` 
			});
		}

		// Check if all pre-OJT requirements are approved
		const requirementsCheck = await exports.checkRequirementsStatus(
			student_internship_id,
			"pre-ojt"
		);

		if (!requirementsCheck.allApproved) {
			return res.status(400).json({
				message: "Cannot start OJT. Not all pre-OJT requirements are approved.",
				data: {
					missingRequirements: requirementsCheck.missingRequirements,
				},
			});
		}

		// Update status to ongoing
		await studentInternship.update({ status: "ongoing" });

		return res.status(200).json({
			message: "OJT started successfully",
			data: studentInternship,
		});
	} catch (error) {
		console.error("Error starting OJT:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Student: Finalize post-OJT (change status to completed) - checks if all post-OJT requirements are approved
exports.finalizePostOJT = async (req, res) => {
	try {
		const { student_internship_id } = req.params;

		// Get student internship
		const studentInternship = await StudentInternship.findOne({
			where: { student_internship_id },
			include: [
				{
					model: StudentTrainee,
					where: { user_id: req.user.user_id },
					required: true,
				},
			],
		});

		if (!studentInternship) {
			return res.status(404).json({ message: "Student internship not found" });
		}

		// Check if current status is post-ojt
		if (studentInternship.status !== "post-ojt") {
			return res.status(400).json({ 
				message: `Cannot finalize post-OJT from ${studentInternship.status} status. Current status must be post-ojt.` 
			});
		}

		// Check if all post-OJT requirements are approved
		const requirementsCheck = await exports.checkRequirementsStatus(
			student_internship_id,
			"post-ojt"
		);

		if (!requirementsCheck.allApproved) {
			return res.status(400).json({
				message: "Cannot finalize post-OJT. Not all post-OJT requirements are approved.",
				data: {
					missingRequirements: requirementsCheck.missingRequirements,
				},
			});
		}

		// Update status to completed
		await studentInternship.update({ status: "completed" });

		return res.status(200).json({
			message: "Post-OJT finalized successfully",
			data: studentInternship,
		});
	} catch (error) {
		console.error("Error finalizing post-OJT:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

