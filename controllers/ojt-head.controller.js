const db = require("../models");
const { OJTHead, User, StudentInternship, Supervisor, Employer, SemestralInternshipListing, Section, Program, SemestralInternship, Industry, Internship } = db;
const bcrypt = require("bcrypt");
const generatePassword = require("../utils/password.generator");
const { sendAccountCredentials } = require("../utils/email.service");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

// Get available academic years and semestrals for filter dropdowns
exports.getFilterOptions = async (req, res) => {
	try {
		// Verify OJT Head
		const ojtHead = await OJTHead.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!ojtHead) {
			return res.status(403).json({ message: "Only OJT Head can access this" });
		}

		// Get all semestral internships to extract unique values
		const semestralInternships = await SemestralInternship.findAll({
			attributes: ["academic_year", "semestral"],
			raw: true,
			order: [["academic_year", "DESC"], ["semestral", "ASC"]],
		});

		// Extract unique academic years and semestrals
		const academicYearSet = new Set();
		const semestralSet = new Set();

		semestralInternships.forEach((si) => {
			if (si.academic_year) {
				academicYearSet.add(si.academic_year);
			}
			if (si.semestral) {
				semestralSet.add(si.semestral);
			}
		});

		const academicYears = Array.from(academicYearSet).sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)
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

exports.registerOJTHead = async (req, res) => {
	try {
		const { first_name, middle_name, last_name, email } = req.body;

		// Validate input
		if (!first_name || !last_name || !email) {
			return res.status(400).json({ message: "Missing required fields" });
		}

		// Check if user already exists
		const existingUser = await User.findOne({ where: { email } });
		if (existingUser) {
			return res.status(409).json({ message: "Email already exists" });
		}

		const plainPassword = generatePassword();
		const hashedPassword = await bcrypt.hash(plainPassword, 10);

		const user = await User.create({
			email,
			password: hashedPassword,
			role: "ojt-head",
			is_password_reset: false,
			status: "enabled",
		});

		const ojtHead = await OJTHead.create({
			first_name,
			middle_name,
			last_name,
			user_id: user.user_id,
			status: "enabled",
		});

		// Send email with credentials
		try {
			const fullName = `${first_name}${middle_name ? ` ${middle_name}` : ""} ${last_name}`.trim();
			await sendAccountCredentials({
				recipient: email,
				name: fullName,
				role: "OJT Head",
				email: email,
				password: plainPassword,
				senderName: "SPARTRACK Admin",
			});
		} catch (emailError) {
			console.error("Failed to send email:", emailError);
			// Don't fail the request if email fails, but log it
		}

		return res.status(201).json({
			message: "OJT Head registered successfully",
			data: {
				user: {
					user_id: user.user_id,
					email: user.email,
					role: user.role,
				},
				ojt_head: ojtHead,
			},
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Error registering OJT Head",
			error: error.message,
		});
	}
};

// Get dashboard statistics for OJT Head
exports.getDashboardStats = async (req, res) => {
	try {
		// Verify OJT Head
		const ojtHead = await OJTHead.findOne({
			where: { user_id: req.user.user_id },
		});

		if (!ojtHead) {
			return res.status(403).json({ message: "Only OJT Head can access this" });
		}

		// Get filter parameters from query string
		const { academic_year, semestral } = req.query;
		
		// Build filter for SemestralInternship if filters are provided
		const semestralInternshipFilter = {};
		if (academic_year && academic_year !== "all") {
			semestralInternshipFilter.academic_year = academic_year;
		}
		if (semestral && semestral !== "all") {
			semestralInternshipFilter.semestral = semestral;
		}

		// Helper function to build include for SemestralInternshipListing with filters
		const buildSemestralInternshipListingInclude = (includeSection = true, alwaysRequired = false) => {
			// If alwaysRequired is true (for queries that need section/program info), always include the relationship
			// If filters are provided, apply them; otherwise, just include without filtering
			const hasFilters = Object.keys(semestralInternshipFilter).length > 0;
			const isRequired = alwaysRequired || hasFilters;

			const includeConfig = [
				{
					model: SemestralInternshipListing,
					attributes: ["semestral_internship_listing_id", "section_id", "semestral_internship_id"],
					include: [
						{
							model: SemestralInternship,
							attributes: ["semestral_internship_id", "academic_year", "semestral"],
							where: hasFilters ? semestralInternshipFilter : undefined,
							required: isRequired,
						},
					],
					required: isRequired,
				},
			];

			if (includeSection) {
				includeConfig[0].include.push({
					model: Section,
					attributes: ["section_id", "section_name", "program_id"],
					include: [
						{
							model: Program,
							attributes: ["program_id", "program_name"],
						},
					],
					required: true,
				});
			}

			return includeConfig;
		};

		// 1. Top Companies with most Students hired as intern
		// Get all student internships with status not "application_seen" or "dropped" and supervisor_id is not null
		// Apply semester/academic year filters if provided
		const studentInternshipsWhere = {
			status: {
				[Op.notIn]: ["application_seen", "dropped"],
			},
			supervisor_id: {
				[Op.ne]: null,
			},
		};

		const studentInternshipsInclude = [
			{
				model: Supervisor,
				attributes: ["supervisor_id", "employer_id"],
				include: [
					{
						model: Employer,
						attributes: ["employer_id", "company_name"],
					},
				],
				required: true,
			},
		];

		// Add SemestralInternshipListing filter if academic_year or semestral is provided
		if (Object.keys(semestralInternshipFilter).length > 0) {
			studentInternshipsInclude.push({
				model: SemestralInternshipListing,
				attributes: ["semestral_internship_listing_id"],
				include: [
					{
						model: SemestralInternship,
						attributes: ["semestral_internship_id", "academic_year", "semestral"],
						where: semestralInternshipFilter,
						required: true,
					},
				],
				required: true,
			});
		}

		const studentInternships = await StudentInternship.findAll({
			where: studentInternshipsWhere,
			include: studentInternshipsInclude,
		});

		// Count students by employer
		const companyMap = new Map();
		studentInternships.forEach((si) => {
			const supervisor = si.supervisor || si.Supervisor;
			const employer = supervisor?.employer || supervisor?.Employer;
			const employerId = employer?.employer_id;
			const companyName = employer?.company_name || "Unknown";

			if (employerId) {
				if (companyMap.has(employerId)) {
					companyMap.set(employerId, {
						employer_id: employerId,
						company_name: companyName,
						student_count: companyMap.get(employerId).student_count + 1,
					});
				} else {
					companyMap.set(employerId, {
						employer_id: employerId,
						company_name: companyName,
						student_count: 1,
					});
				}
			}
		});

		const topCompaniesData = Array.from(companyMap.values())
			.sort((a, b) => b.student_count - a.student_count)
			.slice(0, 10);

		// 2. Count of ongoing internship per program
		const ongoingInternshipsWhere = {
			status: "ongoing",
		};

		const ongoingInternships = await StudentInternship.findAll({
			where: ongoingInternshipsWhere,
			include: buildSemestralInternshipListingInclude(true, true), // alwaysRequired = true because we need section/program
		});

		// Count by program
		const programMap = new Map();
		ongoingInternships.forEach((si) => {
			const listing = si.semestral_internship_listing || si.SemestralInternshipListing;
			const section = listing?.section || listing?.Section;
			const program = section?.program || section?.Program;
			const programId = program?.program_id;
			const programName = program?.program_name || "Unknown";

			if (programId) {
				if (programMap.has(programId)) {
					programMap.set(programId, {
						program_id: programId,
						program_name: programName,
						student_count: programMap.get(programId).student_count + 1,
					});
				} else {
					programMap.set(programId, {
						program_id: programId,
						program_name: programName,
						student_count: 1,
					});
				}
			}
		});

		const ongoingByProgramData = Array.from(programMap.values())
			.sort((a, b) => b.student_count - a.student_count);

		// 3. Count of ongoing internship per semester
		const ongoingBySemesterInternships = await StudentInternship.findAll({
			where: {
				status: "ongoing",
			},
			include: buildSemestralInternshipListingInclude(false, true), // alwaysRequired = true because we need semestral info
		});

		// Count by semester
		const semesterMap = new Map();
		ongoingBySemesterInternships.forEach((si) => {
			const listing = si.semestral_internship_listing || si.SemestralInternshipListing;
			const semestralInternship = listing?.semestral_internship || listing?.SemestralInternship;
			const semestralInternshipId = semestralInternship?.semestral_internship_id;
			const academicYear = semestralInternship?.academic_year || "Unknown";
			const semestral = semestralInternship?.semestral || "Unknown";

			const key = `${academicYear}-${semestral}`;
			if (semestralInternshipId) {
				if (semesterMap.has(key)) {
					semesterMap.set(key, {
						semestral_internship_id: semestralInternshipId,
						academic_year: academicYear,
						semestral: semestral,
						student_count: semesterMap.get(key).student_count + 1,
					});
				} else {
					semesterMap.set(key, {
						semestral_internship_id: semestralInternshipId,
						academic_year: academicYear,
						semestral: semestral,
						student_count: 1,
					});
				}
			}
		});

		const ongoingBySemesterData = Array.from(semesterMap.values())
			.sort((a, b) => {
				// Sort by academic year (descending) then by semestral
				if (a.academic_year !== b.academic_year) {
					return b.academic_year.localeCompare(a.academic_year);
				}
				const semestralOrder = { "1st Semester": 1, "2nd Semester": 2, "Midterm": 3 };
				return (semestralOrder[a.semestral] || 0) - (semestralOrder[b.semestral] || 0);
			});

		// 4. Key Metrics: Total Interns, Companies Hosting Interns, Evaluated Interns, Pending Evaluations
		const allStudentInternshipsWhere = {
			status: {
				[Op.notIn]: ["application_seen", "dropped"],
			},
		};

		const allStudentInternshipsInclude = [];
		if (Object.keys(semestralInternshipFilter).length > 0) {
			allStudentInternshipsInclude.push({
				model: SemestralInternshipListing,
				attributes: ["semestral_internship_listing_id"],
				include: [
					{
						model: SemestralInternship,
						attributes: ["semestral_internship_id", "academic_year", "semestral"],
						where: semestralInternshipFilter,
						required: true,
					},
				],
				required: true,
			});
		}

		const allStudentInternships = await StudentInternship.findAll({
			where: allStudentInternshipsWhere,
			include: allStudentInternshipsInclude.length > 0 ? allStudentInternshipsInclude : undefined,
		});

		const totalInterns = allStudentInternships.length;

		// Companies hosting interns (unique employers with supervisors)
		const companiesHostingInterns = new Set();
		const allInternshipsWithSupervisorsWhere = {
			supervisor_id: {
				[Op.ne]: null,
			},
			status: {
				[Op.notIn]: ["application_seen", "dropped"],
			},
		};

		const allInternshipsWithSupervisorsInclude = [
			{
				model: Supervisor,
				attributes: ["supervisor_id", "employer_id"],
				required: true,
			},
		];

		if (Object.keys(semestralInternshipFilter).length > 0) {
			allInternshipsWithSupervisorsInclude.push({
				model: SemestralInternshipListing,
				attributes: ["semestral_internship_listing_id"],
				include: [
					{
						model: SemestralInternship,
						attributes: ["semestral_internship_id", "academic_year", "semestral"],
						where: semestralInternshipFilter,
						required: true,
					},
				],
				required: true,
			});
		}

		const allInternshipsWithSupervisors = await StudentInternship.findAll({
			where: allInternshipsWithSupervisorsWhere,
			include: allInternshipsWithSupervisorsInclude,
		});

		allInternshipsWithSupervisors.forEach((si) => {
			const supervisor = si.supervisor || si.Supervisor;
			if (supervisor?.employer_id) {
				companiesHostingInterns.add(supervisor.employer_id);
			}
		});

		// Evaluated interns (status = "graded" or "completed")
		const evaluatedInternsWhere = {
			status: {
				[Op.in]: ["graded", "completed"],
			},
		};

		const evaluatedInterns = await StudentInternship.count({
			where: evaluatedInternsWhere,
			include: Object.keys(semestralInternshipFilter).length > 0 ? [
				{
					model: SemestralInternshipListing,
					attributes: ["semestral_internship_listing_id"],
					include: [
						{
							model: SemestralInternship,
							attributes: ["semestral_internship_id", "academic_year", "semestral"],
							where: semestralInternshipFilter,
							required: true,
						},
					],
					required: true,
				},
			] : undefined,
			distinct: true,
			col: "student_internship_id",
		});

		// Pending evaluations (status = "ongoing" or "post-ojt")
		const pendingEvaluationsWhere = {
			status: {
				[Op.in]: ["ongoing", "post-ojt"],
			},
		};

		const pendingEvaluations = await StudentInternship.count({
			where: pendingEvaluationsWhere,
			include: Object.keys(semestralInternshipFilter).length > 0 ? [
				{
					model: SemestralInternshipListing,
					attributes: ["semestral_internship_listing_id"],
					include: [
						{
							model: SemestralInternship,
							attributes: ["semestral_internship_id", "academic_year", "semestral"],
							where: semestralInternshipFilter,
							required: true,
						},
					],
					required: true,
				},
			] : undefined,
			distinct: true,
			col: "student_internship_id",
		});

		// 5. Interns by Program (all statuses except dropped/application_seen)
		const allInternshipsByProgramWhere = {
			status: {
				[Op.notIn]: ["application_seen", "dropped"],
			},
		};

		const allInternshipsByProgram = await StudentInternship.findAll({
			where: allInternshipsByProgramWhere,
			include: buildSemestralInternshipListingInclude(true, true), // alwaysRequired = true because we need section/program
		});

		const internsByProgramMap = new Map();
		allInternshipsByProgram.forEach((si) => {
			const listing = si.semestral_internship_listing || si.SemestralInternshipListing;
			const section = listing?.section || listing?.Section;
			const program = section?.program || section?.Program;
			const programId = program?.program_id;
			const programName = program?.program_name || "Unknown";

			if (programId) {
				if (internsByProgramMap.has(programId)) {
					internsByProgramMap.set(programId, {
						program_id: programId,
						program_name: programName,
						intern_count: internsByProgramMap.get(programId).intern_count + 1,
					});
				} else {
					internsByProgramMap.set(programId, {
						program_id: programId,
						program_name: programName,
						intern_count: 1,
					});
				}
			}
		});

		const internsByProgramData = Array.from(internsByProgramMap.values())
			.sort((a, b) => b.intern_count - a.intern_count);

		// 6. OJT Completion by Program (completed vs pending)
		const completionByProgramMap = new Map();
		allInternshipsByProgram.forEach((si) => {
			const listing = si.semestral_internship_listing || si.SemestralInternshipListing;
			const section = listing?.section || listing?.Section;
			const program = section?.program || section?.Program;
			const programId = program?.program_id;
			const programName = program?.program_name || "Unknown";

			if (programId) {
				if (!completionByProgramMap.has(programId)) {
					completionByProgramMap.set(programId, {
						program_id: programId,
						program_name: programName,
						completed: 0,
						pending: 0,
					});
				}

				const completion = completionByProgramMap.get(programId);
				if (si.status === "completed" || si.status === "graded") {
					completion.completed += 1;
				} else {
					completion.pending += 1;
				}
			}
		});

		const completionByProgramData = Array.from(completionByProgramMap.values()).map((item) => {
			const total = item.completed + item.pending;
			return {
				program_id: item.program_id,
				program_name: item.program_name,
				completed: item.completed,
				pending: item.pending,
				completed_percentage: total > 0 ? Math.round((item.completed / total) * 100) : 0,
				pending_percentage: total > 0 ? Math.round((item.pending / total) * 100) : 0,
			};
		});

		// 7. Internship Listings by Industry
		const allInternships = await Internship.findAll({
			where: {
				approval_status: "approved",
				status: "enabled",
			},
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
					required: true,
				},
			],
		});

		const industryMap = new Map();
		allInternships.forEach((internship) => {
			const employer = internship.employer || internship.Employer;
			const industry = employer?.industry || employer?.Industry;
			const industryId = industry?.industry_id;
			const industryName = industry?.industry_name || "Unknown";

			if (industryId) {
				if (industryMap.has(industryId)) {
					industryMap.set(industryId, {
						industry_id: industryId,
						industry_name: industryName,
						count: industryMap.get(industryId).count + 1,
					});
				} else {
					industryMap.set(industryId, {
						industry_id: industryId,
						industry_name: industryName,
						count: 1,
					});
				}
			}
		});

		const internshipsByIndustryData = Array.from(industryMap.values())
			.sort((a, b) => b.count - a.count);

		// 8. Evaluation Status (Evaluated vs Pending)
		const evaluationStatus = {
			evaluated: evaluatedInterns,
			pending: pendingEvaluations,
			total: evaluatedInterns + pendingEvaluations,
		};

		// 9. Monthly OJT Engagement (based on createdAt of StudentInternship)
		// Use a raw query to handle column naming - try common Sequelize timestamp column names
		let monthlyEngagementData = [];
		try {
			// Try different possible column names for the created timestamp
			const possibleColumns = ['"createdAt"', 'createdAt', 'created_at', 'createdat'];
			
			let allMonthlyInternshipsWithDates = null;
			let lastError = null;
			
			for (const colName of possibleColumns) {
				try {
					// Build WHERE clause for filters
					let whereClause = "status NOT IN ('application_seen', 'dropped')";
					let joinClause = "";
					
					if (Object.keys(semestralInternshipFilter).length > 0) {
						joinClause = `
							INNER JOIN semestral_internship_listings sil ON si.student_internship_id = sil.student_internship_id
							INNER JOIN semestral_internships si_main ON sil.semestral_internship_id = si_main.semestral_internship_id
						`;
						
						const filterConditions = [];
						if (semestralInternshipFilter.academic_year) {
							filterConditions.push(`si_main.academic_year = '${semestralInternshipFilter.academic_year.replace(/'/g, "''")}'`);
						}
						if (semestralInternshipFilter.semestral) {
							filterConditions.push(`si_main.semestral = '${semestralInternshipFilter.semestral.replace(/'/g, "''")}'`);
						}
						
						if (filterConditions.length > 0) {
							whereClause += ` AND ${filterConditions.join(" AND ")}`;
						}
					}

					const query = `
						SELECT 
							si.student_internship_id,
							si.${colName} as created_date
						FROM student_internships si
						${joinClause}
						WHERE ${whereClause}
						ORDER BY si.${colName} ASC
						LIMIT 1000
					`;
					
					allMonthlyInternshipsWithDates = await db.sequelize.query(query, {
						type: Sequelize.QueryTypes.SELECT,
					});
					
					// If we got here, the query succeeded
					break;
				} catch (err) {
					lastError = err;
					continue; // Try next column name
				}
			}
			
			if (!allMonthlyInternshipsWithDates || allMonthlyInternshipsWithDates.length === 0) {
				console.warn("Could not find created timestamp column for student_internships:", lastError?.message);
				monthlyEngagementData = [];
			} else {
				// Group by month
				const monthlyMap = new Map();
				allMonthlyInternshipsWithDates.forEach((si) => {
					if (!si.created_date) return;
					
					const createdAt = new Date(si.created_date);
					if (isNaN(createdAt.getTime())) return; // Invalid date
					
					const year = createdAt.getFullYear();
					const month = createdAt.getMonth() + 1;
					const monthKey = `${year}-${String(month).padStart(2, "0")}`;
					
					const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
					const monthLabel = `${monthNames[createdAt.getMonth()]} ${year}`;
					const monthShort = monthNames[createdAt.getMonth()];

					if (monthlyMap.has(monthKey)) {
						monthlyMap.set(monthKey, {
							month: monthLabel,
							monthShort: monthShort,
							monthKey: monthKey,
							count: monthlyMap.get(monthKey).count + 1,
						});
					} else {
						monthlyMap.set(monthKey, {
							month: monthLabel,
							monthShort: monthShort,
							monthKey: monthKey,
							count: 1,
						});
					}
				});

				monthlyEngagementData = Array.from(monthlyMap.values())
					.sort((a, b) => {
						// Sort by monthKey (YYYY-MM format)
						return a.monthKey.localeCompare(b.monthKey);
					})
					.slice(-12) // Get last 12 months
					.map((item) => ({
						month: item.month,
						monthShort: item.monthShort,
						count: item.count,
					}));
			}
		} catch (monthlyError) {
			console.error("Error fetching monthly engagement:", monthlyError);
			// If there's an error, return empty array instead of failing the entire request
			monthlyEngagementData = [];
		}

		// 10. Internship Opportunities vs Student Count by Program
		// Count enrolled students by program
		const enrolledByProgramMap = new Map();
		allInternshipsByProgram.forEach((si) => {
			const listing = si.semestral_internship_listing || si.SemestralInternshipListing;
			const section = listing?.section || listing?.Section;
			const program = section?.program || section?.Program;
			const programId = program?.program_id;
			const programName = program?.program_name || "Unknown";

			if (programId) {
				if (enrolledByProgramMap.has(programId)) {
					enrolledByProgramMap.set(programId, {
						program_id: programId,
						program_name: programName,
						enrolled_students: enrolledByProgramMap.get(programId).enrolled_students + 1,
					});
				} else {
					enrolledByProgramMap.set(programId, {
						program_id: programId,
						program_name: programName,
						enrolled_students: 1,
					});
				}
			}
		});

		// Count internship opportunities (approved internships) - this represents available opportunities
		// Since we don't have a direct link between internships and programs, we'll use total opportunities
		const totalOpportunities = allInternships.length;

		// Create opportunities by program data
		// For now, we'll show enrolled students and total opportunities (distributed proportionally)
		const opportunitiesByProgramData = Array.from(enrolledByProgramMap.values()).map((item) => {
			const totalEnrolled = Array.from(enrolledByProgramMap.values()).reduce(
				(sum, i) => sum + i.enrolled_students,
				0
			);
			// Distribute opportunities proportionally based on enrolled students
			const opportunities = totalEnrolled > 0
				? Math.round((item.enrolled_students / totalEnrolled) * totalOpportunities)
				: 0;

			return {
				program_id: item.program_id,
				program_name: item.program_name,
				enrolled_students: item.enrolled_students,
				internship_opportunities: opportunities,
			};
		}).sort((a, b) => b.enrolled_students - a.enrolled_students);

		return res.status(200).json({
			message: "Dashboard statistics retrieved successfully",
			data: {
				// Key Metrics
				totalInterns,
				companiesHostingInterns: companiesHostingInterns.size,
				evaluatedInterns,
				pendingEvaluations,
				// Charts Data
				topCompanies: topCompaniesData,
				ongoingByProgram: ongoingByProgramData,
				ongoingBySemester: ongoingBySemesterData,
				internsByProgram: internsByProgramData,
				completionByProgram: completionByProgramData,
				internshipsByIndustry: internshipsByIndustryData,
				evaluationStatus,
				monthlyEngagement: monthlyEngagementData,
				opportunitiesByProgram: opportunitiesByProgramData,
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
