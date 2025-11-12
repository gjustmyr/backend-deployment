const { User } = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getPathByRole } = require("../utils/role.util");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET;

exports.login = async (req, res) => {
	try {
		const { email, password, role } = req.body;

		if (!email || !password || !role) {
			return res
				.status(400)
				.json({ message: "Email, password, and role are required." });
		}

		// Map frontend role names to backend role names
		const roleMapping = {
			"company-representative": "employer",
			"job-placement": "job-placement-head",
			"super-admin": "superadmin",
			"training-supervisor": "supervisor",
		};

		const backendRole = roleMapping[role] || role;

		const user = await User.findOne({ where: { email } });
		if (!user) {
			return res.status(404).json({ message: "User not found." });
		}

		if (user.status === "disabled") {
			return res.status(403).json({ message: "Account is disabled." });
		}

		const isValid = await bcrypt.compare(password, user.password);

		if (!isValid) {
			return res.status(401).json({ message: "Invalid email or password." });
		}

		if (user.role !== backendRole) {
			return res.status(403).json({
				message: `Invalid email or password.`,
			});
		}

		const token = jwt.sign(
			{
				user_id: user.user_id,
				email: user.email,
				role: user.role,
			},
			JWT_SECRET,
			{ expiresIn: "1d" }
		);

		const path = getPathByRole(user.role);

		return res.status(200).json({
			message: "Login successful",
			data: {
				user_id: user.user_id,
				email: user.email,
				role: user.role,
				status: user.status,
				token,
				path,
			},
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: "Error during login",
			error: error.message,
		});
	}
};
