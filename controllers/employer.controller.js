const db = require("../models");
const { User, Employer, MOA, Industry } = db;
const bcrypt = require("bcrypt");
const generatePassword = require("../utils/password.generator");
const { sendAccountCredentials } = require("../utils/email.service");

exports.create = async (req, res) => {
	try {
		const {
			company_name,
			company_overview,
			contact_person,
			contact_email,
			contact_phone,
			street_address,
			city_address,
			province_address,
			postal_code,
			website_url,
			working_hours_start,
			working_hours_end,
			industry_id,
			signed_date,
			expiration_date,
		} = req.body;

		if (
			!company_name ||
			!contact_email ||
			!req.file?.path ||
			!signed_date ||
			!expiration_date
		) {
			return res
				.status(400)
				.json({ message: "All required fields must be provided" });
		}

		// Check if email exists
		const existingUser = await User.findOne({
			where: { email: contact_email },
		});
		if (existingUser)
			return res.status(409).json({ message: "Email already exists" });

		// Generate password
		const plainPassword = generatePassword();
		const hashedPassword = await bcrypt.hash(plainPassword, 10);

		// Create User
		const user = await User.create({
			email: contact_email,
			password: hashedPassword,
			role: "employer",
			is_password_reset: false,
			status: "enabled",
		});

		// Create Employer
		const employer = await Employer.create({
			company_name,
			company_overview,
			contact_person,
			contact_email,
			contact_phone,
			street_address,
			city_address,
			province_address,
			postal_code,
			website_url,
			working_hours_start,
			working_hours_end,
			industry_id,
			user_id: user.user_id,
		});

		// Save MOA
		const moa = await MOA.create({
			employer_id: employer.employer_id,
			document_url: req.file.path,
			signed_date,
			expiration_date,
			status: "active",
		});

		// Send email with credentials
		try {
			const name = contact_person || company_name;
			await sendAccountCredentials({
				recipient: contact_email,
				name: name,
				role: "Employer",
				email: contact_email,
				password: plainPassword,
				senderName: "SPARTRACK Admin",
			});
		} catch (emailError) {
			console.error("Failed to send email:", emailError);
			// Don't fail the request if email fails, but log it
		}

		return res.status(201).json({
			message: "Employer and MOA created successfully",
			data: { employer, moa },
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

exports.getAll = async (req, res) => {
	try {
		const { status } = req.query;
		const whereClause = {};
		if (status) whereClause.status = status;

		const employers = await Employer.findAll({
			where: whereClause,
			include: [
				{ model: User, attributes: ["user_id", "email", "role"] },
				{ model: MOA },
			],
			order: [["createdAt", "DESC"]],
		});

		res.status(200).json({
			message: "Employers fetched successfully",
			count: employers.length,
			data: employers,
		});
	} catch (err) {
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

exports.update = async (req, res) => {
	try {
		const { employer_id } = req.params;
		const employer = await Employer.findByPk(employer_id);
		if (!employer)
			return res.status(404).json({ message: "Employer not found" });

		await employer.update({
			company_name: req.body.company_name || employer.company_name,
			company_overview: req.body.company_overview || employer.company_overview,
			contact_person: req.body.contact_person || employer.contact_person,
			contact_email: req.body.contact_email || employer.contact_email,
			contact_phone: req.body.contact_phone || employer.contact_phone,
			street_address: req.body.street_address || employer.street_address,
			city_address: req.body.city_address || employer.city_address,
			province_address: req.body.province_address || employer.province_address,
			postal_code: req.body.postal_code || employer.postal_code,
			website_url: req.body.website_url || employer.website_url,
			working_hours_start:
				req.body.working_hours_start || employer.working_hours_start,
			working_hours_end:
				req.body.working_hours_end || employer.working_hours_end,
			industry_id: req.body.industry_id || employer.industry_id,
		});

		// Update MOA if file or dates provided
		if (req.file?.path || req.body.signed_date || req.body.expiration_date) {
			const existingMoa = await MOA.findOne({ where: { employer_id } });
			if (existingMoa) {
				await existingMoa.update({
					document_url: req.file?.path || existingMoa.document_url,
					signed_date: req.body.signed_date || existingMoa.signed_date,
					expiration_date:
						req.body.expiration_date || existingMoa.expiration_date,
				});
			} else if (req.file?.path) {
				await MOA.create({
					employer_id,
					document_url: req.file.path,
					signed_date: req.body.signed_date,
					expiration_date: req.body.expiration_date,
					status: "active",
				});
			}
		}

		res
			.status(200)
			.json({ message: "Employer updated successfully", data: employer });
	} catch (err) {
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

exports.toggleStatus = async (req, res) => {
	try {
		const { employer_id } = req.params;
		const employer = await Employer.findByPk(employer_id);
		if (!employer)
			return res.status(404).json({ message: "Employer not found" });

		const newStatus = employer.status === "enabled" ? "disabled" : "enabled";
		await employer.update({ status: newStatus });

		res
			.status(200)
			.json({ message: `Employer ${newStatus} successfully`, data: employer });
	} catch (err) {
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

// Get current employer profile
exports.getCurrentProfile = async (req, res) => {
	try {
		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
			include: [
				{ model: User, attributes: ["user_id", "email", "role", "profile_picture"] },
				{ model: MOA },
				{ model: Industry, attributes: ["industry_id", "industry_name"] },
			],
		});

		if (!employer) {
			return res.status(404).json({ message: "Employer profile not found" });
		}

		res.status(200).json({
			message: "Profile fetched successfully",
			data: employer,
		});
	} catch (err) {
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};

// Update current employer profile (with profile picture upload)
exports.updateCurrentProfile = async (req, res) => {
	try {
		// Check if user is authenticated
		if (!req.user || !req.user.user_id) {
			return res.status(401).json({ message: "Unauthorized: User not authenticated" });
		}

		const employer = await Employer.findOne({
			where: { user_id: req.user.user_id },
			include: [{ model: User }],
		});

		if (!employer) {
			return res.status(404).json({ message: "Employer profile not found" });
		}

		// Update employer fields (Multer parses multipart/form-data into req.body)
		const updateData = {
			company_name: req.body.company_name !== undefined ? req.body.company_name : employer.company_name,
			company_overview: req.body.company_overview !== undefined ? req.body.company_overview : employer.company_overview,
			contact_person: req.body.contact_person !== undefined ? req.body.contact_person : employer.contact_person,
			contact_email: req.body.contact_email !== undefined ? req.body.contact_email : employer.contact_email,
			contact_phone: req.body.contact_phone !== undefined ? req.body.contact_phone : employer.contact_phone,
			street_address: req.body.street_address !== undefined ? req.body.street_address : employer.street_address,
			city_address: req.body.city_address !== undefined ? req.body.city_address : employer.city_address,
			province_address: req.body.province_address !== undefined ? req.body.province_address : employer.province_address,
			postal_code: req.body.postal_code !== undefined ? req.body.postal_code : employer.postal_code,
			website_url: req.body.website_url !== undefined ? req.body.website_url : employer.website_url,
			working_hours_start: req.body.working_hours_start !== undefined ? req.body.working_hours_start : employer.working_hours_start,
			working_hours_end: req.body.working_hours_end !== undefined ? req.body.working_hours_end : employer.working_hours_end,
			industry_id: req.body.industry_id !== undefined ? req.body.industry_id : employer.industry_id,
		};

		await employer.update(updateData);

		// Update user profile picture if provided
		if (req.file?.path) {
			await User.update(
				{ profile_picture: req.file.path },
				{ where: { user_id: req.user.user_id } }
			);
		}

		// Fetch updated employer with all relationships
		const updatedEmployer = await Employer.findByPk(employer.employer_id, {
			include: [
				{ model: User, attributes: ["user_id", "email", "role", "profile_picture"] },
				{ model: MOA },
				{ model: Industry, attributes: ["industry_id", "industry_name"] },
			],
		});

		res.status(200).json({
			message: "Profile updated successfully",
			data: updatedEmployer,
		});
	} catch (err) {
		console.error("Update profile error:", err);
		res.status(500).json({ message: "Server Error", error: err.message });
	}
};