const db = require("../models");
const { User, OJTCoordinator, Department, OJTHead, StudentTrainee, StudentInternship, SemestralInternshipListing, SemestralInternship, Supervisor } = db;
const bcrypt = require("bcrypt");
const generatePassword = require("../utils/password.generator");
const { sendAccountCredentials } = require("../utils/email.service");
const XLSX = require("xlsx");

// Create a new OJT Coordinator
exports.create = async (req, res) => {
	try {
		//fint the ojt head id from the ojt head table
		const ojtHead = await OJTHead.findOne({
			where: { user_id: req.user.user_id },
		});
		if (!ojtHead) {
			return res.status(404).json({ message: "OJT Head not found." });
		}
		const {
			first_name,
			middle_name,
			last_name,
			email,
			department_id,
		} = req.body;

		if (!first_name || !last_name || !email || !department_id) {
			return res
				.status(400)
				.json({ message: "All required fields must be provided." });
		}

		const existingUser = await User.findOne({ where: { email } });
		if (existingUser) {
			return res.status(409).json({ message: "Email already exists." });
		}

		// Generate password
		const plainPassword = generatePassword();
		const hashedPassword = await bcrypt.hash(plainPassword, 10);

		const user = await User.create({
			email,
			password: hashedPassword,
			role: "ojt-coordinator",
			is_password_reset: false,
			status: "enabled",
		});

		const coordinator = await OJTCoordinator.create({
			first_name,
			middle_name,
			last_name,
			user_id: user.user_id,
			ojt_head_id: ojtHead.ojt_head_id,
			department_id: department_id,
		});

		// Send email with credentials
		try {
			const fullName = `${first_name}${middle_name ? ` ${middle_name}` : ""} ${last_name}`.trim();
			await sendAccountCredentials({
				recipient: email,
				name: fullName,
				role: "OJT Coordinator",
				email: email,
				password: plainPassword,
				senderName: "SPARTRACK Admin",
			});
		} catch (emailError) {
			console.error("Failed to send email:", emailError);
			// Don't fail the request if email fails, but log it
		}

		return res.status(201).json({
			message: "OJT Coordinator created successfully.",
			data: coordinator,
		});
	} catch (error) {
		console.error("Error creating OJT Coordinator:", error);
		res
			.status(500)
			.json({ message: "Internal Server Error", error: error.message });
	}
};

// Update OJT Coordinator info
exports.update = async (req, res) => {
	try {
		const { ojt_coordinator_id } = req.params;
		const { first_name, middle_name, last_name, department_id } = req.body;

		const coordinator = await OJTCoordinator.findByPk(ojt_coordinator_id);
		if (!coordinator) {
			return res.status(404).json({ message: "OJT Coordinator not found." });
		}

		await coordinator.update({
			first_name: first_name || coordinator.first_name,
			middle_name:
				middle_name !== undefined ? middle_name : coordinator.middle_name,
			last_name: last_name || coordinator.last_name,
			department_id: department_id || coordinator.department_id,
		});

		return res.status(200).json({
			message: "OJT Coordinator updated successfully.",
			data: coordinator,
		});
	} catch (error) {
		console.error("Error updating OJT Coordinator:", error);
		res
			.status(500)
			.json({ message: "Internal Server Error", error: error.message });
	}
};

// Enable or Disable OJT Coordinator
exports.toggleStatus = async (req, res) => {
	try {
		const { ojt_coordinator_id } = req.params;

		const coordinator = await OJTCoordinator.findByPk(ojt_coordinator_id);
		if (!coordinator) {
			return res.status(404).json({ message: "OJT Coordinator not found." });
		}

		const newStatus = coordinator.status === "enabled" ? "disabled" : "enabled";
		await coordinator.update({ status: newStatus });

		return res.status(200).json({
			message: `OJT Coordinator ${newStatus} successfully.`,
			data: coordinator,
		});
	} catch (error) {
		console.error("Error toggling OJT Coordinator status:", error);
		res
			.status(500)
			.json({ message: "Internal Server Error", error: error.message });
	}
};

exports.getAll = async (req, res) => {
	try {
		const { status, search, department_id } = req.query;

		const whereClause = {};
		const userWhereClause = {}; // for email search

		// Filter by status (enabled/disabled)
		if (status) whereClause.status = status;

		// Filter by department
		if (department_id && department_id !== "all") {
			whereClause.department_id = department_id;
		}

		// Add search filter (by name or email)
		if (search) {
			whereClause[db.Sequelize.Op.or] = [
				{ first_name: { [db.Sequelize.Op.iLike]: `%${search}%` } },
				{ middle_name: { [db.Sequelize.Op.iLike]: `%${search}%` } },
				{ last_name: { [db.Sequelize.Op.iLike]: `%${search}%` } },
			];

			// Email search in related User model
			userWhereClause.email = { [db.Sequelize.Op.iLike]: `%${search}%` };
		}

		const coordinators = await OJTCoordinator.findAll({
			where: whereClause,
			include: [
				{
					model: User,
					as: "user",
					where: Object.keys(userWhereClause).length
						? userWhereClause
						: undefined,
					attributes: ["user_id", "email", "role"],
				},
				{
					model: Department,
					as: "department",
					attributes: ["department_id", "department_name", "department_abbv"],
				},
			],
			order: [["createdAt", "DESC"]],
		});

		return res.status(200).json({
			message: "OJT Coordinators retrieved successfully.",
			count: coordinators.length,
			data: coordinators,
		});
	} catch (error) {
		console.error("Error fetching OJT Coordinators:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Get students by section for the current coordinator
exports.getStudentsBySection = async (req, res) => {
	try {
		const { StudentTrainee, StudentInternship, SemestralInternshipListing, Section, SemestralInternship } = db;

		// Get current coordinator from user_id
		const coordinator = await OJTCoordinator.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!coordinator) {
			return res.status(404).json({ message: "Coordinator not found" });
		}

		// Get all listings for this coordinator
		const listings = await SemestralInternshipListing.findAll({
			where: { ojt_coordinator_id: coordinator.ojt_coordinator_id },
			include: [
				{
					model: Section,
					attributes: ["section_id", "section_name"],
				},
				{
					model: SemestralInternship,
					attributes: ["semestral_internship_id", "academic_year", "semestral"],
				},
			],
		});

		console.log(`Found ${listings.length} listings for coordinator ${coordinator.ojt_coordinator_id}`);
		
		// If no listings, return empty array (coordinator has no sections assigned)
		if (listings.length === 0) {
			console.log(`No listings found for coordinator ${coordinator.ojt_coordinator_id}. Coordinator needs sections assigned by OJT Head.`);
			return res.status(200).json({
				message: "No sections assigned to this coordinator",
				data: [],
			});
		}

		// Get student internships for these listings
		const listingIds = listings.map((l) => l.semestral_internship_listing_id);

		const studentInternships = await StudentInternship.findAll({
			where: {
				semestral_internship_listing_id: listingIds,
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
				},
				{
					model: SemestralInternshipListing,
					include: [
						{
							model: Section,
							attributes: ["section_id", "section_name"],
						},
						{
							model: SemestralInternship,
							attributes: ["semestral_internship_id", "academic_year", "semestral"],
						},
					],
					attributes: ["semestral_internship_listing_id", "section_id", "semestral_internship_id"],
				},
			],
		});

		// Group by section + academic year + semestral (composite key)
		const groupedBySection = {};

		// First, initialize all listings (even if they have no students)
		listings.forEach((listing) => {
			// Handle both lowercase and capitalized association names
			const section = listing.section || listing.Section;
			const semestralInternship = listing.semestral_internship || listing.SemestralInternship;
			
			if (!section || !semestralInternship) {
				console.error(`Listing ${listing.semestral_internship_listing_id} is missing section or semestral_internship`);
				return; // Skip this listing if associations are missing
			}
			
			const sectionId = section.section_id;
			const sectionName = section.section_name;
			const academicYear = semestralInternship.academic_year;
			const semestral = semestralInternship.semestral;

			// Use composite key to allow same section in different semestrals
			const compositeKey = `${sectionId}-${academicYear}-${semestral}`;

			if (!groupedBySection[compositeKey]) {
				groupedBySection[compositeKey] = {
					section_id: sectionId,
					section_name: sectionName,
					academic_year: academicYear,
					semestral: semestral,
					students: [],
				};
			}
		});

		// Then, add students to their respective sections
		studentInternships.forEach((si) => {
			const listing = si.semestral_internship_listing;
			// Handle both lowercase and capitalized association names
			const section = listing?.section || listing?.Section;
			const semestralInternship = listing?.semestral_internship || listing?.SemestralInternship;
			
			if (!section || !semestralInternship) {
				console.error(`StudentInternship ${si.student_internship_id} has invalid listing associations`);
				return; // Skip this student if associations are missing
			}
			
			const sectionId = section.section_id;
			const academicYear = semestralInternship.academic_year;
			const semestral = semestralInternship.semestral;

			// Use composite key to allow same section in different semestrals
			const compositeKey = `${sectionId}-${academicYear}-${semestral}`;

			if (groupedBySection[compositeKey] && si.student_trainee) {
				groupedBySection[compositeKey].students.push({
					student_internship_id: si.student_internship_id,
					student_trainee_id: si.student_trainee.student_trainee_id,
					first_name: si.student_trainee.first_name,
					middle_name: si.student_trainee.middle_name,
					last_name: si.student_trainee.last_name,
					prefix_name: si.student_trainee.prefix_name,
					suffix_name: si.student_trainee.suffix_name,
					status: si.status,
				});
			}
		});

		const sectionsData = Object.values(groupedBySection);
		console.log(`Returning ${sectionsData.length} sections for coordinator ${coordinator.ojt_coordinator_id}`);

		return res.status(200).json({
			message: "Students retrieved successfully",
			data: sectionsData,
		});
	} catch (error) {
		console.error("Error fetching students by section:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Add students to a section and create accounts
exports.addStudentsToSection = async (req, res) => {
	try {
		const { section_id, academic_year, semestral, students } = req.body;

		if (!section_id || !academic_year || !semestral || !students || !Array.isArray(students) || students.length === 0) {
			return res.status(400).json({ message: "Section ID, academic year, semestral, and students array are required" });
		}

		// Get current coordinator
		const coordinator = await OJTCoordinator.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!coordinator) {
			return res.status(404).json({ message: "Coordinator not found" });
		}

		// Find the semestral internship listing for this section, academic year, and semestral
		const semestralInternship = await SemestralInternship.findOne({
			where: {
				academic_year,
				semestral,
			},
		});

		if (!semestralInternship) {
			return res.status(404).json({ message: "Semestral internship not found for the given academic year and semestral" });
		}

		const listing = await SemestralInternshipListing.findOne({
			where: {
				semestral_internship_id: semestralInternship.semestral_internship_id,
				section_id: section_id,
				ojt_coordinator_id: coordinator.ojt_coordinator_id,
			},
		});

		if (!listing) {
			return res.status(404).json({ message: "Section listing not found for this coordinator" });
		}

		const createdStudents = [];
		const errors = [];
		const emailErrors = [];

		// Process each student
		for (const studentData of students) {
			try {
				const { first_name, last_name, middle_name, prefix_name, suffix_name, email, sex, civil_status } = studentData;

				// Validate required fields (password no longer required from form)
				if (!first_name || !last_name || !email || !sex || !civil_status) {
					errors.push({ student: `${first_name || ""} ${last_name || ""}`, error: "Missing required fields" });
					continue;
				}

				// Check if email already exists
				const existingUser = await User.findOne({ where: { email } });
				if (existingUser) {
					errors.push({ student: `${first_name} ${last_name}`, error: "Email already exists" });
					continue;
				}

				// Generate password
				const plainPassword = generatePassword();
				const hashedPassword = await bcrypt.hash(plainPassword, 10);

				// Create User account
				const user = await User.create({
					email,
					password: hashedPassword,
					role: "student-trainee",
					status: "enabled",
					is_password_reset: false,
				});

				// Create StudentTrainee
				const studentTrainee = await StudentTrainee.create({
					first_name,
					middle_name: middle_name || null,
					last_name,
					prefix_name: prefix_name || null,
					suffix_name: suffix_name || null,
					sex,
					civil_status,
					user_id: user.user_id,
					status: "enabled",
				});

				// Create StudentInternship (assign to section)
				await StudentInternship.create({
					student_trainee_id: studentTrainee.student_trainee_id,
					semestral_internship_listing_id: listing.semestral_internship_listing_id,
					status: "pre-ojt",
				});

				// Send email with credentials
				let emailSent = false;
				try {
					const fullName = `${first_name}${middle_name ? ` ${middle_name}` : ""} ${last_name}`.trim();
					await sendAccountCredentials({
						recipient: email,
						name: fullName,
						role: "Student Trainee",
						email: email,
						password: plainPassword,
						senderName: "SPARTRACK Admin",
					});
					emailSent = true;
					console.log(`Email sent successfully to ${email} for student ${fullName}`);
				} catch (emailError) {
					console.error(`Failed to send email to ${email}:`, emailError);
					emailErrors.push({
						student: `${first_name} ${last_name}`,
						email: email,
						error: emailError.message || "Failed to send email",
					});
				}

				createdStudents.push({
					student_trainee_id: studentTrainee.student_trainee_id,
					first_name,
					last_name,
					email,
					email_sent: emailSent,
				});
			} catch (error) {
				console.error(`Error creating student ${studentData.first_name} ${studentData.last_name}:`, error);
				errors.push({ student: `${studentData.first_name || ""} ${studentData.last_name || ""}`, error: error.message });
			}
		}

		const successMessage = `Successfully created ${createdStudents.length} student(s)`;
		const emailWarning = emailErrors.length > 0 ? `. ${emailErrors.length} email(s) failed to send.` : "";
		
		return res.status(201).json({
			message: successMessage + emailWarning,
			data: {
				created: createdStudents,
				errors: errors.length > 0 ? errors : undefined,
				email_errors: emailErrors.length > 0 ? emailErrors : undefined,
			},
		});
	} catch (error) {
		console.error("Error adding students to section:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Add students from Excel file
exports.addStudentsFromExcel = async (req, res) => {
	try {
		const { section_id, academic_year, semestral } = req.body;

		if (!section_id || !academic_year || !semestral || !req.file) {
			return res.status(400).json({ 
				message: "Section ID, academic year, semestral, and Excel file are required" 
			});
		}

		// Get current coordinator
		const coordinator = await OJTCoordinator.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!coordinator) {
			return res.status(404).json({ message: "Coordinator not found" });
		}

		// Find the semestral internship listing
		const semestralInternship = await SemestralInternship.findOne({
			where: {
				academic_year,
				semestral,
			},
		});

		if (!semestralInternship) {
			return res.status(404).json({ 
				message: "Semestral internship not found for the given academic year and semestral" 
			});
		}

		const listing = await SemestralInternshipListing.findOne({
			where: {
				semestral_internship_id: semestralInternship.semestral_internship_id,
				section_id: section_id,
				ojt_coordinator_id: coordinator.ojt_coordinator_id,
			},
		});

		if (!listing) {
			return res.status(404).json({ 
				message: "Section listing not found for this coordinator" 
			});
		}

		// Parse Excel file
		const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
		const sheetName = workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];
		const data = XLSX.utils.sheet_to_json(worksheet);

		if (!data || data.length === 0) {
			return res.status(400).json({ 
				message: "Excel file is empty or has no data" 
			});
		}

		// Map Excel columns to student data
		const createdStudents = [];
		const errors = [];
		const emailErrors = [];

		for (let i = 0; i < data.length; i++) {
			const row = data[i];
			try {
				// Normalize column names (case-insensitive, handle spaces/underscores)
				const getValue = (row, possibleKeys) => {
					for (const key of possibleKeys) {
						const normalizedKey = Object.keys(row).find(
							k => k.toLowerCase().replace(/[_\s]/g, "") === key.toLowerCase().replace(/[_\s]/g, "")
						);
						if (normalizedKey && row[normalizedKey]) {
							return String(row[normalizedKey]).trim();
						}
					}
					return "";
				};

				const first_name = getValue(row, ["FirstName", "First Name", "first_name", "firstname"]);
				const last_name = getValue(row, ["LastName", "Last Name", "last_name", "lastname"]);
				const middle_name = getValue(row, ["MiddleName", "Middle Name", "middle_name", "middlename"]) || "";
				const prefix_name = getValue(row, ["PrefixName", "Prefix Name", "Prefix", "prefix_name", "prefix"]) || "";
				const suffix_name = getValue(row, ["SuffixName", "Suffix Name", "Suffix", "suffix_name", "suffix"]) || "";
				const email = getValue(row, ["Email", "email", "Email Address", "email_address"]);
				const sex = getValue(row, ["Sex", "sex", "Gender", "gender"]).toLowerCase();
				const civil_status = getValue(row, ["CivilStatus", "Civil Status", "civil_status", "civilstatus"]).toLowerCase();

				// Validate required fields
				if (!first_name || !last_name || !email) {
					errors.push({ 
						row: i + 2, 
						student: `${first_name || ""} ${last_name || ""}`.trim() || `Row ${i + 2}`, 
						error: "Missing required fields (First Name, Last Name, Email)" 
					});
					continue;
				}

				// Validate and normalize sex
				let normalizedSex = sex;
				if (sex === "m" || sex === "male" || sex === "1") {
					normalizedSex = "male";
				} else if (sex === "f" || sex === "female" || sex === "2") {
					normalizedSex = "female";
				} else {
					errors.push({ 
						row: i + 2, 
						student: `${first_name} ${last_name}`, 
						error: `Invalid sex value: ${sex}. Must be 'male' or 'female'` 
					});
					continue;
				}

				// Validate and normalize civil status
				let normalizedCivilStatus = civil_status;
				const validCivilStatuses = ["single", "married", "widowed", "separated"];
				if (!validCivilStatuses.includes(normalizedCivilStatus)) {
					// Try to map common variations
					const statusMap = {
						"s": "single",
						"m": "married",
						"w": "widowed",
						"sep": "separated",
						"divorced": "separated",
					};
					normalizedCivilStatus = statusMap[normalizedCivilStatus] || "single";
				}

				// Check if email already exists
				const existingUser = await User.findOne({ where: { email } });
				if (existingUser) {
					errors.push({ 
						row: i + 2, 
						student: `${first_name} ${last_name}`, 
						error: "Email already exists" 
					});
					continue;
				}

				// Generate password
				const plainPassword = generatePassword();
				const hashedPassword = await bcrypt.hash(plainPassword, 10);

				// Create User account
				const user = await User.create({
					email,
					password: hashedPassword,
					role: "student-trainee",
					status: "enabled",
					is_password_reset: false,
				});

				// Create StudentTrainee
				const studentTrainee = await StudentTrainee.create({
					first_name,
					middle_name: middle_name || null,
					last_name,
					prefix_name: prefix_name || null,
					suffix_name: suffix_name || null,
					sex: normalizedSex,
					civil_status: normalizedCivilStatus,
					user_id: user.user_id,
					status: "enabled",
				});

				// Create StudentInternship (assign to section)
				await StudentInternship.create({
					student_trainee_id: studentTrainee.student_trainee_id,
					semestral_internship_listing_id: listing.semestral_internship_listing_id,
					status: "pre-ojt",
				});

				// Send email with credentials
				let emailSent = false;
				try {
					const fullName = `${first_name}${middle_name ? ` ${middle_name}` : ""} ${last_name}`.trim();
					await sendAccountCredentials({
						recipient: email,
						name: fullName,
						role: "Student Trainee",
						email: email,
						password: plainPassword,
						senderName: "SPARTRACK Admin",
					});
					emailSent = true;
					console.log(`Email sent successfully to ${email} for student ${fullName} (row ${i + 2})`);
				} catch (emailError) {
					console.error(`Failed to send email to ${email} (row ${i + 2}):`, emailError);
					emailErrors.push({
						row: i + 2,
						student: `${first_name} ${last_name}`,
						email: email,
						error: emailError.message || "Failed to send email",
					});
				}

				createdStudents.push({
					student_trainee_id: studentTrainee.student_trainee_id,
					first_name,
					last_name,
					email,
					email_sent: emailSent,
				});
			} catch (error) {
				console.error(`Error creating student from row ${i + 2}:`, error);
				const rowFirst = row.FirstName || row["First Name"] || "";
				const rowLast = row.LastName || row["Last Name"] || "";
				errors.push({ 
					row: i + 2, 
					student: `${rowFirst} ${rowLast}`.trim() || `Row ${i + 2}`, 
					error: error.message 
				});
			}
		}

		const successMessage = `Successfully created ${createdStudents.length} student(s) from Excel`;
		const emailWarning = emailErrors.length > 0 ? `. ${emailErrors.length} email(s) failed to send.` : "";
		
		return res.status(201).json({
			message: successMessage + emailWarning,
			data: {
				created: createdStudents,
				errors: errors.length > 0 ? errors : undefined,
				email_errors: emailErrors.length > 0 ? emailErrors : undefined,
				total_rows: data.length,
			},
		});
	} catch (error) {
		console.error("Error adding students from Excel:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Get dashboard statistics for OJT Coordinator
exports.getDashboardStats = async (req, res) => {
	try {
		// Get current coordinator
		const coordinator = await OJTCoordinator.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!coordinator) {
			return res.status(404).json({ message: "Coordinator not found" });
		}

		// Get filter parameters
		const { academic_year, semestral } = req.query;

		// Build filter for SemestralInternship
		const semestralInternshipFilter = {};
		if (academic_year && academic_year !== "all") {
			semestralInternshipFilter.academic_year = academic_year;
		}
		if (semestral && semestral !== "all") {
			semestralInternshipFilter.semestral = semestral;
		}

		// Get all listings for this coordinator
		const hasFilters = Object.keys(semestralInternshipFilter).length > 0;
		const listings = await SemestralInternshipListing.findAll({
			where: { ojt_coordinator_id: coordinator.ojt_coordinator_id },
			include: [
				{
					model: SemestralInternship,
					where: hasFilters ? semestralInternshipFilter : undefined,
					required: false, // Always include even without filters to get all listings
					attributes: ["semestral_internship_id", "academic_year", "semestral"],
				},
			],
		});

		// Filter listings - first filter out any without semestral_internship, then apply filters if provided
		let filteredListings = listings.filter((listing) => {
			const si = listing.semestral_internship || listing.SemestralInternship;
			return !!si; // Only include listings with valid semestral_internship
		});

		// Apply additional filters if provided
		if (hasFilters) {
			filteredListings = filteredListings.filter((listing) => {
				const si = listing.semestral_internship || listing.SemestralInternship;
				if (!si) return false;
				if (semestralInternshipFilter.academic_year && si.academic_year !== semestralInternshipFilter.academic_year) {
					return false;
				}
				if (semestralInternshipFilter.semestral && si.semestral !== semestralInternshipFilter.semestral) {
					return false;
				}
				return true;
			});
		}

		const listingIds = filteredListings.map((l) => l.semestral_internship_listing_id);

		if (listingIds.length === 0) {
			return res.status(200).json({
				message: "Dashboard statistics retrieved successfully",
				data: {
					statusDistribution: {},
					totalStudents: 0,
					totalHours: 0,
					averageHours: 0,
					studentsByStatus: [],
					studentsWithHours: [],
				},
			});
		}

		// Get all student internships for this coordinator's sections
		const Op = db.Sequelize.Op;
		const studentInternships = await StudentInternship.findAll({
			where: {
				semestral_internship_listing_id: { [Op.in]: listingIds },
			},
			include: [
				{
					model: StudentTrainee,
					attributes: ["student_trainee_id", "first_name", "middle_name", "last_name"],
				},
			],
			attributes: ["student_internship_id", "status", "ojt_hours", "student_trainee_id"],
		});

		// Calculate status distribution
		const statusDistribution = {};
		const statusCounts = {
			application_seen: 0,
			hired: 0,
			starting: 0,
			"pre-ojt": 0,
			ongoing: 0,
			completed: 0,
			dropped: 0,
			"post-ojt": 0,
			graded: 0,
		};

		let totalHours = 0;
		let studentsWithHoursCount = 0;
		const studentsWithHours = [];
		const studentsByStatus = [];

		studentInternships.forEach((si) => {
			const status = si.status || "application_seen";
			statusCounts[status] = (statusCounts[status] || 0) + 1;

			const hours = si.ojt_hours || 0;
			if (hours > 0) {
				totalHours += hours;
				studentsWithHoursCount++;
			}

			// Collect students with hours
			if (si.student_trainee) {
				const studentName = `${si.student_trainee.first_name} ${si.student_trainee.middle_name || ""} ${si.student_trainee.last_name}`.trim();
				
				if (hours > 0) {
					studentsWithHours.push({
						student_internship_id: si.student_internship_id,
						student_name: studentName,
						status: status,
						ojt_hours: hours,
					});
				}

				studentsByStatus.push({
					student_internship_id: si.student_internship_id,
					student_name: studentName,
					status: status,
					ojt_hours: hours || 0,
				});
			}
		});

		// Format status distribution for pie chart
		Object.keys(statusCounts).forEach((status) => {
			if (statusCounts[status] > 0) {
				statusDistribution[status] = statusCounts[status];
			}
		});

		const averageHours = studentsWithHoursCount > 0 ? totalHours / studentsWithHoursCount : 0;

		// Sort students by hours (descending)
		studentsWithHours.sort((a, b) => b.ojt_hours - a.ojt_hours);

		return res.status(200).json({
			message: "Dashboard statistics retrieved successfully",
			data: {
				statusDistribution,
				totalStudents: studentInternships.length,
				totalHours: Math.round(totalHours * 100) / 100,
				averageHours: Math.round(averageHours * 100) / 100,
				studentsByStatus,
				studentsWithHours,
			},
		});
	} catch (error) {
		console.error("Error fetching dashboard statistics:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Get filter options for dashboard (academic years and semestrals)
exports.getFilterOptions = async (req, res) => {
	try {
		// Get current coordinator
		const coordinator = await OJTCoordinator.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!coordinator) {
			return res.status(404).json({ message: "Coordinator not found" });
		}

		// Get all listings for this coordinator
		const listings = await SemestralInternshipListing.findAll({
			where: { ojt_coordinator_id: coordinator.ojt_coordinator_id },
			include: [
				{
					model: SemestralInternship,
					attributes: ["academic_year", "semestral"],
				},
			],
		});

		// Extract unique academic years and semestrals
		const academicYearSet = new Set();
		const semestralSet = new Set();

		listings.forEach((listing) => {
			const si = listing.semestral_internship || listing.SemestralInternship;
			if (si) {
				if (si.academic_year) {
					academicYearSet.add(si.academic_year);
				}
				if (si.semestral) {
					semestralSet.add(si.semestral);
				}
			}
		});

		const academicYears = Array.from(academicYearSet).sort((a, b) => b.localeCompare(a));
		const semestrals = Array.from(semestralSet);

		// Sort semestrals in order: 1st Semester, 2nd Semester, Midterm
		const semestralOrder = { "1st Semester": 1, "2nd Semester": 2, "Midterm": 3 };
		semestrals.sort((a, b) => (semestralOrder[a] || 0) - (semestralOrder[b] || 0));

		return res.status(200).json({
			message: "Filter options retrieved successfully",
			data: {
				academicYears,
				semestrals,
			},
		});
	} catch (error) {
		console.error("Error fetching filter options:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Assign supervisor to student internship
exports.assignSupervisor = async (req, res) => {
	try {
		const { student_internship_id } = req.params;
		const { supervisor_id } = req.body;

		if (!supervisor_id) {
			return res.status(400).json({ message: "Supervisor ID is required" });
		}

		// Get current coordinator
		const coordinator = await OJTCoordinator.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!coordinator) {
			return res.status(404).json({ message: "Coordinator not found" });
		}

		// Get student internship and verify it belongs to coordinator's sections
		const studentInternship = await StudentInternship.findByPk(student_internship_id, {
			include: [
				{
					model: SemestralInternshipListing,
					where: { ojt_coordinator_id: coordinator.ojt_coordinator_id },
					required: true,
				},
			],
		});

		if (!studentInternship) {
			return res.status(404).json({ message: "Student internship not found or not accessible" });
		}

		// Verify supervisor exists
		const supervisor = await Supervisor.findByPk(supervisor_id);
		if (!supervisor) {
			return res.status(404).json({ message: "Supervisor not found" });
		}

		// Update student internship with supervisor
		await studentInternship.update({ supervisor_id });

		// Fetch updated student internship with supervisor details
		const updatedInternship = await StudentInternship.findByPk(student_internship_id, {
			include: [
				{
					model: Supervisor,
					include: [
						{
							model: Employer,
							attributes: ["employer_id", "company_name"],
						},
					],
					attributes: ["supervisor_id", "first_name", "last_name", "employer_id"],
				},
				{
					model: StudentTrainee,
					attributes: ["student_trainee_id", "first_name", "last_name"],
				},
			],
		});

		res.status(200).json({
			message: "Supervisor assigned successfully",
			data: updatedInternship,
		});
	} catch (error) {
		console.error("Error assigning supervisor:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};
