const nodemailer = require("nodemailer");
require("dotenv").config();

// Verify SMTP configuration
const smtpConfig = {
	host: process.env.SMTP_HOST || "smtp.gmail.com",
	port: parseInt(process.env.SMTP_PORT || "587", 10),
	secure: false, // true for 465, false for other ports
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
};

// Log SMTP configuration (without password)
console.log("SMTP Configuration:", {
	host: smtpConfig.host,
	port: smtpConfig.port,
	secure: smtpConfig.secure,
	user: smtpConfig.auth.user,
	hasPassword: !!smtpConfig.auth.pass,
});

if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
	console.error("WARNING: SMTP_USER or SMTP_PASS is not set in environment variables!");
}

const transporter = nodemailer.createTransport(smtpConfig);

// Verify transporter connection
transporter.verify((error, success) => {
	if (error) {
		console.error("SMTP Connection Error:", error);
	} else {
		console.log("SMTP Server is ready to send emails");
	}
});

const sendEmail = async (to, subject, html, fromName = "SPARTRACK Portal") => {
	try {
		if (!to) {
			throw new Error("Recipient email address is required");
		}

		if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
			throw new Error("SMTP credentials are not configured. Please check SMTP_USER and SMTP_PASS environment variables.");
		}

		const mailOptions = {
			from: `"${fromName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
			to,
			subject,
			html,
		};

		console.log(`Attempting to send email to: ${to}`);
		console.log(`Subject: ${subject}`);
		
		const info = await transporter.sendMail(mailOptions);
		console.log(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
		return info;
	} catch (error) {
		console.error("Failed to send email:", error);
		console.error("Error details:", {
			message: error.message,
			code: error.code,
			command: error.command,
			response: error.response,
			responseCode: error.responseCode,
		});
		throw error;
	}
};

const sendAccountCredentials = async ({
	recipient,
	name,
	role,
	email,
	password,
	senderName = "SPARTRACK Admin",
}) => {
	try {
		// Validate required parameters
		if (!recipient || !email) {
			throw new Error("Recipient email is required");
		}
		if (!name) {
			throw new Error("Recipient name is required");
		}
		if (!role) {
			throw new Error("Role is required");
		}
		if (!password) {
			throw new Error("Password is required");
		}

		console.log(`Preparing to send account credentials email to: ${recipient} (${name})`);

		const html = `
			<div style="font-family: 'Poppins', Arial, sans-serif; background-color: #f6f6f6; padding: 0; margin: 0;">
				<div style="background: linear-gradient(90deg, #a00000 0%, #780000 100%); color: #fff; padding: 25px 15px; text-align: center; border-bottom: 5px solid #111;">
					<h1 style="margin: 0; font-weight: 800; letter-spacing: 1px; font-size: 24px;">SPARTRACK PORTAL</h1>
					<p style="margin: 4px 0 0; font-size: 13px; letter-spacing: 2px; text-transform: uppercase;">Track. Train. Thrive.</p>
				</div>
				<div style="background-color: #fff; padding: 30px 25px; max-width: 600px; margin: 25px auto; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
					<h2 style="color: #a00000; font-weight: 700;">Welcome, ${name}!</h2>
					<p style="font-size: 15px; line-height: 1.7; color: #333;">
						Your <b>${role}</b> account has been successfully created in the <b>SPARTRACK</b> system.
					</p>
					<div style="background: #fafafa; border-left: 4px solid #a00000; padding: 10px 15px; margin: 15px 0; border-radius: 6px;">
						<p style="margin: 0;"><b>Email:</b> ${email}</p>
						<p style="margin: 0;"><b>Temporary Password:</b> ${password}</p>
					</div>
					<p style="font-size: 14px; line-height: 1.6; color: #333;">
						Please log in to your account at
						<a href="${
							process.env.APP_URL || "#"
						}" style="color: #a00000; text-decoration: none; font-weight: 600;">
							${process.env.APP_URL || "the SPARTRACK Portal"}
						</a>
						and change your password immediately for security.
					</p>
					<br />
					<p style="font-size: 14px; color: #555;">Best regards,<br><b>${senderName}</b></p>
				</div>
				<div style="background-color: #111; color: #fff; text-align: center; padding: 12px 0; font-size: 12px; letter-spacing: 2px;">
					<span style="color: #f1c40f;">T R A C K.</span>&nbsp;&nbsp;
					<span style="color: #e74c3c;">T R A I N.</span>&nbsp;&nbsp;
					<span style="color: #f1c40f;">T H R I V E.</span>
				</div>
			</div>
		`;

		await sendEmail(
			recipient,
			`Your SPARTRACK ${role} Account Credentials`,
			html,
			senderName
		);

		console.log(`Account credentials email sent successfully to ${recipient}`);
	} catch (error) {
		console.error(`Error in sendAccountCredentials for ${recipient}:`, error);
		throw error;
	}
};

module.exports = { sendEmail, sendAccountCredentials };

