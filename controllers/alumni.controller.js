const bcrypt = require("bcrypt");
const db = require("../models");
const { User, Alumni } = db;

const sanitizeProfilePayload = (payload = {}) => {
	const allowedFields = [
		"first_name",
		"middle_name",
		"last_name",
		"contact_number",
		"current_position",
		"company_name",
		"linked_in_url",
		"resume_url",
	];

	const data = {};
	allowedFields.forEach((field) => {
		if (payload[field] !== undefined) {
			data[field] = payload[field];
		}
	});
	return data;
};

exports.register = async (req, res) => {
	try {
		const {
			first_name,
			middle_name,
			last_name,
			email,
			password,
			contact_number,
			current_position,
			company_name,
			linked_in_url,
		} = req.body;

		if (!first_name || !last_name || !email || !password) {
			return res.status(400).json({
				message: "First name, last name, email, and password are required",
			});
		}

		const existingUser = await User.findOne({ where: { email } });
		if (existingUser) {
			return res.status(409).json({
				message: "An account with this email already exists",
			});
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const user = await User.create({
			email,
			password: hashedPassword,
			role: "alumni",
			status: "disabled",
			is_password_reset: false,
		});

		const alumni = await Alumni.create({
			first_name,
			middle_name: middle_name || null,
			last_name,
			contact_number: contact_number || null,
			current_position: current_position || null,
			company_name: company_name || null,
			linked_in_url: linked_in_url || null,
			user_id: user.user_id,
		});

		return res.status(201).json({
			message: "Registration successful. Please wait for validation from the Job Placement Office.",
			data: {
				user: {
					user_id: user.user_id,
					email: user.email,
					role: user.role,
					status: user.status,
				},
				alumni,
			},
		});
	} catch (error) {
		console.error("Error registering alumni:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

exports.getCurrentProfile = async (req, res) => {
	try {
		const alumni = await Alumni.findOne({
			where: { user_id: req.user.user_id },
			include: [
				{
					model: User,
					attributes: ["user_id", "email", "role", "status", "profile_picture"],
				},
			],
		});

		if (!alumni) {
			return res.status(404).json({ message: "Alumni profile not found" });
		}

		return res.status(200).json({
			message: "Profile fetched successfully",
			data: alumni,
		});
	} catch (error) {
		console.error("Error fetching alumni profile:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

exports.updateCurrentProfile = async (req, res) => {
	try {
		const alumni = await Alumni.findOne({
			where: { user_id: req.user.user_id },
			include: [{ model: User }],
		});

		if (!alumni) {
			return res.status(404).json({ message: "Alumni profile not found" });
		}

		const payload = sanitizeProfilePayload(req.body);

		// Support resume upload through multer (PDF)
		if (req.file?.path) {
			payload.resume_url = req.file.path;
		}

		await alumni.update(payload);

		const updatedAlumni = await Alumni.findOne({
			where: { alumni_id: alumni.alumni_id },
			include: [
				{
					model: User,
					attributes: ["user_id", "email", "role", "status", "profile_picture"],
				},
			],
		});

		return res.status(200).json({
			message: "Profile updated successfully",
			data: updatedAlumni,
		});
	} catch (error) {
		console.error("Error updating alumni profile:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

