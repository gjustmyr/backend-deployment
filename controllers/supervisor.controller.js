const db = require("../models");
const { Supervisor, User, Employer, StudentInternship, StudentTrainee, Internship, Attendance } = db;
const bcryptLib = require("bcrypt");
const generatePassword = require("../utils/password.generator");
const { sendAccountCredentials } = require("../utils/email.service");

// Get current supervisor profile
exports.getCurrentProfile = async (req, res) => {
	try {
		const supervisor = await Supervisor.findOne({
			where: { user_id: req.user.user_id },
			include: [
				{
					model: User,
					attributes: ["user_id", "email", "role", "profile_picture"],
				},
				{
					model: Employer,
					attributes: ["employer_id", "company_name", "contact_email", "contact_phone"],
				},
			],
		});

		if (!supervisor) {
			return res.status(404).json({ message: "Supervisor profile not found" });
		}

		res.status(200).json({
			message: "Profile fetched successfully",
			data: supervisor,
		});
	} catch (error) {
		console.error("Error fetching supervisor profile:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Update current supervisor profile
exports.updateCurrentProfile = async (req, res) => {
	try {
		const supervisor = await Supervisor.findOne({
			where: { user_id: req.user.user_id },
			include: [{ model: User }],
		});

		if (!supervisor) {
			return res.status(404).json({ message: "Supervisor profile not found" });
		}

		const { first_name, middle_name, last_name } = req.body;

		await supervisor.update({
			first_name: first_name || supervisor.first_name,
			middle_name: middle_name !== undefined ? middle_name : supervisor.middle_name,
			last_name: last_name || supervisor.last_name,
		});

		// Update user profile picture if provided
		if (req.file?.path) {
			await User.update(
				{ profile_picture: req.file.path },
				{ where: { user_id: req.user.user_id } }
			);
		}

		// Fetch updated supervisor
		const updatedSupervisor = await Supervisor.findByPk(supervisor.supervisor_id, {
			include: [
				{
					model: User,
					attributes: ["user_id", "email", "role", "profile_picture"],
				},
				{
					model: Employer,
					attributes: ["employer_id", "company_name"],
				},
			],
		});

		res.status(200).json({
			message: "Profile updated successfully",
			data: updatedSupervisor,
		});
	} catch (error) {
		console.error("Error updating supervisor profile:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Get all interns assigned to this supervisor
exports.getMyInterns = async (req, res) => {
	try {
		const supervisor = await Supervisor.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!supervisor) {
			return res.status(404).json({ message: "Supervisor not found" });
		}

		const interns = await StudentInternship.findAll({
			where: {
				supervisor_id: supervisor.supervisor_id,
				status: {
					[db.Sequelize.Op.in]: ["ongoing", "post-ojt", "completed"],
				},
			},
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
							model: User,
							attributes: ["email"],
						},
					],
				},
			],
			order: [["createdAt", "DESC"]],
		});

		res.status(200).json({
			message: "Interns fetched successfully",
			data: interns,
		});
	} catch (error) {
		console.error("Error fetching interns:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Get all internships of the supervisor's company
exports.getCompanyInternships = async (req, res) => {
	try {
		const supervisor = await Supervisor.findOne({
			where: { user_id: req.user.user_id },
			include: [
				{
					model: Employer,
					attributes: ["employer_id"],
				},
			],
		});

		if (!supervisor) {
			return res.status(404).json({ message: "Supervisor not found" });
		}

		const internships = await Internship.findAll({
			where: {
				employer_id: supervisor.employer_id,
				status: "enabled",
			},
			include: [
				{
					model: Employer,
					attributes: ["company_name", "contact_email", "contact_phone"],
				},
			],
			order: [["createdAt", "DESC"]],
		});

		res.status(200).json({
			message: "Company internships fetched successfully",
			data: internships,
		});
	} catch (error) {
		console.error("Error fetching company internships:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Create supervisor (for employer)
exports.create = async (req, res) => {
	try {
		const { first_name, middle_name, last_name, email } = req.body;

		if (!first_name || !last_name || !email) {
			return res.status(400).json({ message: "Missing required fields" });
		}

		// Get current employer
		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!employer) {
			return res.status(404).json({ message: "Employer not found" });
		}

		// Check if email already exists
		const existingUser = await User.findOne({ where: { email } });
		if (existingUser) {
			return res.status(409).json({ message: "Email already exists" });
		}

		// Generate password
		const plainPassword = generatePassword();
		const hashedPassword = await bcryptLib.hash(plainPassword, 10);

		// Create User
		const user = await User.create({
			email,
			password: hashedPassword,
			role: "supervisor",
			is_password_reset: false,
			status: "enabled",
		});

		// Create Supervisor
		const supervisor = await Supervisor.create({
			first_name,
			middle_name: middle_name || null,
			last_name,
			user_id: user.user_id,
			employer_id: employer.employer_id,
			status: "enabled",
		});

		// Send email with credentials
		try {
			const fullName = `${first_name}${middle_name ? ` ${middle_name}` : ""} ${last_name}`.trim();
			await sendAccountCredentials({
				recipient: email,
				name: fullName,
				role: "Training Supervisor",
				email: email,
				password: plainPassword,
				senderName: "SPARTRACK Admin",
			});
		} catch (emailError) {
			console.error("Failed to send email:", emailError);
			// Don't fail the request if email fails
		}

		const createdSupervisor = await Supervisor.findByPk(supervisor.supervisor_id, {
			include: [
				{
					model: User,
					attributes: ["user_id", "email", "role"],
				},
			],
		});

		res.status(201).json({
			message: "Supervisor created successfully",
			data: createdSupervisor,
		});
	} catch (error) {
		console.error("Error creating supervisor:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Get all supervisors for an employer
exports.getByEmployer = async (req, res) => {
	try {
		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!employer) {
			return res.status(404).json({ message: "Employer not found" });
		}

		const supervisors = await Supervisor.findAll({
			where: { employer_id: employer.employer_id },
			include: [
				{
					model: User,
					attributes: ["user_id", "email", "role", "status"],
				},
			],
			order: [["createdAt", "DESC"]],
		});

		res.status(200).json({
			message: "Supervisors fetched successfully",
			data: supervisors,
		});
	} catch (error) {
		console.error("Error fetching supervisors:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Update supervisor
exports.update = async (req, res) => {
	try {
		const { supervisor_id } = req.params;
		const { first_name, middle_name, last_name } = req.body;

		const supervisor = await Supervisor.findByPk(supervisor_id);

		if (!supervisor) {
			return res.status(404).json({ message: "Supervisor not found" });
		}

		// Check if employer owns this supervisor
		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
		});

		if (supervisor.employer_id !== employer.employer_id) {
			return res.status(403).json({ message: "Unauthorized" });
		}

		await supervisor.update({
			first_name: first_name || supervisor.first_name,
			middle_name: middle_name !== undefined ? middle_name : supervisor.middle_name,
			last_name: last_name || supervisor.last_name,
		});

		res.status(200).json({
			message: "Supervisor updated successfully",
			data: supervisor,
		});
	} catch (error) {
		console.error("Error updating supervisor:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Toggle supervisor status
exports.toggleStatus = async (req, res) => {
	try {
		const { supervisor_id } = req.params;

		const supervisor = await Supervisor.findByPk(supervisor_id);

		if (!supervisor) {
			return res.status(404).json({ message: "Supervisor not found" });
		}

		// Check if employer owns this supervisor
		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
		});

		if (supervisor.employer_id !== employer.employer_id) {
			return res.status(403).json({ message: "Unauthorized" });
		}

		const newStatus = supervisor.status === "enabled" ? "disabled" : "enabled";
		await supervisor.update({ status: newStatus });

		// Also update user status
		await User.update(
			{ status: newStatus },
			{ where: { user_id: supervisor.user_id } }
		);

		res.status(200).json({
			message: `Supervisor ${newStatus} successfully`,
			data: supervisor,
		});
	} catch (error) {
		console.error("Error toggling supervisor status:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Get attendance records for an intern
exports.getInternAttendance = async (req, res) => {
	try {
		const { student_internship_id } = req.params;
		const { start_date, end_date } = req.query;

		const supervisor = await Supervisor.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!supervisor) {
			return res.status(404).json({ message: "Supervisor not found" });
		}

		// Verify this intern is assigned to this supervisor
		const studentInternship = await StudentInternship.findOne({
			where: {
				student_internship_id,
				supervisor_id: supervisor.supervisor_id,
			},
		});

		if (!studentInternship) {
			return res.status(404).json({ message: "Intern not found or not assigned to you" });
		}

		const whereClause = { student_internship_id };
		if (start_date && end_date) {
			whereClause.date = {
				[db.Sequelize.Op.between]: [start_date, end_date],
			};
		}

		const attendances = await Attendance.findAll({
			where: whereClause,
			order: [["date", "DESC"]],
		});

		res.status(200).json({
			message: "Attendance records fetched successfully",
			data: attendances,
		});
	} catch (error) {
		console.error("Error fetching attendance:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Verify attendance (mark as verified)
exports.verifyAttendance = async (req, res) => {
	try {
		const { attendance_id } = req.params;

		const supervisor = await Supervisor.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!supervisor) {
			return res.status(404).json({ message: "Supervisor not found" });
		}

		const attendance = await Attendance.findByPk(attendance_id, {
			include: [
				{
					model: StudentInternship,
					where: { supervisor_id: supervisor.supervisor_id },
					required: true,
				},
			],
		});

		if (!attendance) {
			return res.status(404).json({ message: "Attendance record not found or not accessible" });
		}

		await attendance.update({
			is_verified: true,
			supervisor_id: supervisor.supervisor_id,
		});

		res.status(200).json({
			message: "Attendance verified successfully",
			data: attendance,
		});
	} catch (error) {
		console.error("Error verifying attendance:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Modify attendance
exports.modifyAttendance = async (req, res) => {
	try {
		const { attendance_id } = req.params;
		const { time_in, time_out, working_arrangement, task_for_day, accomplishments, hours_worked, modification_notes } = req.body;

		const supervisor = await Supervisor.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!supervisor) {
			return res.status(404).json({ message: "Supervisor not found" });
		}

		const attendance = await Attendance.findByPk(attendance_id, {
			include: [
				{
					model: StudentInternship,
					where: { supervisor_id: supervisor.supervisor_id },
					required: true,
				},
			],
		});

		if (!attendance) {
			return res.status(404).json({ message: "Attendance record not found or not accessible" });
		}

		// Update attendance with supervisor modifications
		await attendance.update({
			time_in: time_in || attendance.time_in,
			time_out: time_out || attendance.time_out,
			working_arrangement: working_arrangement || attendance.working_arrangement,
			task_for_day: task_for_day !== undefined ? task_for_day : attendance.task_for_day,
			accomplishments: accomplishments !== undefined ? accomplishments : attendance.accomplishments,
			hours_worked: hours_worked !== undefined ? hours_worked : attendance.hours_worked,
			is_modified: true,
			modified_by_supervisor_id: supervisor.supervisor_id,
			modification_notes: modification_notes || null,
			is_verified: true,
			supervisor_id: supervisor.supervisor_id,
		});

		// Update total OJT hours in student internship
		const totalHours = await Attendance.sum("hours_worked", {
			where: { student_internship_id: attendance.student_internship_id },
		});

		await StudentInternship.update(
			{ ojt_hours: totalHours || 0 },
			{ where: { student_internship_id: attendance.student_internship_id } }
		);

		const updatedAttendance = await Attendance.findByPk(attendance_id);

		res.status(200).json({
			message: "Attendance modified successfully",
			data: updatedAttendance,
		});
	} catch (error) {
		console.error("Error modifying attendance:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

