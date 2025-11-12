const db = require("../models");
const { StudentInternship, StudentTrainee, SemestralInternshipListing, Section, Program, SemestralInternship, Supervisor, Employer } = db;

// Get current student's internship
exports.getMyStudentInternship = async (req, res) => {
	try {
		// Get student trainee
		const studentTrainee = await StudentTrainee.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!studentTrainee) {
			return res.status(404).json({ message: "Student trainee not found" });
		}

		// Get student's internship (most recent or active)
		const studentInternship = await StudentInternship.findOne({
			where: { student_trainee_id: studentTrainee.student_trainee_id },
			include: [
				{
					model: SemestralInternshipListing,
					include: [
						{
							model: Section,
							include: [
								{
									model: Program,
									attributes: ["program_id", "program_name"],
								},
							],
							attributes: ["section_id", "section_name", "program_id"],
						},
						{
							model: SemestralInternship,
							attributes: ["semestral_internship_id", "academic_year", "semestral"],
						},
					],
					attributes: ["semestral_internship_listing_id", "section_id", "semestral_internship_id"],
				},
				{
					model: Supervisor,
					include: [
						{
							model: Employer,
							attributes: ["employer_id", "company_name", "contact_person", "contact_email", "contact_phone"],
						},
					],
					attributes: ["supervisor_id", "first_name", "last_name", "email", "employer_id"],
					required: false,
				},
			],
			order: [["createdAt", "DESC"]],
		});

		if (!studentInternship) {
			return res.status(404).json({ 
				message: "No internship found for this student",
				data: null,
			});
		}

		return res.status(200).json({
			message: "Student internship retrieved successfully",
			data: studentInternship,
		});
	} catch (error) {
		console.error("Error fetching student internship:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};



