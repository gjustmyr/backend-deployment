const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const db = require("./models");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
	cors: {
		origin: "http://localhost:5173",
		methods: ["GET", "POST"],
		credentials: true,
	},
});

var corsOptions = {
	origin: "http://localhost:5173",
};

app.use(cors(corsOptions));

// Body parsers - but skip multipart/form-data (handled by multer)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

db.sequelize
	.sync({ alter: true })
	.then(() => {
		console.log("Synced db.");
	})
	.catch((err) => {
		console.log("Failed to sync db: " + err.message);
	});

app.use("/api/ojt-heads", require("./routes/ojt-head.routes"));
app.use("/api/ojt-head", require("./routes/ojt-head.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/ojt-coordinators", require("./routes/ojt-coordinator.routes"));
app.use("/api/dropdowns", require("./routes/dropdown.routes"));
app.use("/api/ojt-requirements", require("./routes/ojt-requirement.routes"));
app.use("/api/student-requirements", require("./routes/student-requirement.routes"));
app.use("/api/student-internships", require("./routes/student-internship.routes"));
app.use("/api/employers", require("./routes/employer.routes"));
app.use("/api/internships", require("./routes/internship.routes"));
app.use("/api/sections", require("./routes/section.routes"));
app.use(
	"/api/semestral-internships",
	require("./routes/semestral-internship.routes")
);
app.use("/api/skills", require("./routes/skill.routes"));
app.use("/api/messages", require("./routes/message.routes"));
app.use("/api/supervisors", require("./routes/supervisor.routes"));
app.use("/api/student-trainees", require("./routes/student-trainee.routes"));
app.use("/api/alumni", require("./routes/alumni.routes"));
app.use("/api/job-placement", require("./routes/job-placement.routes"));
app.use("/api/job-applications", require("./routes/job-application.routes"));
app.use("/api/job-requirements", require("./routes/job-requirement.routes"));

// Socket.IO authentication middleware
io.use((socket, next) => {
	const token = socket.handshake.auth.token;
	if (!token) {
		return next(new Error("Authentication error: No token provided"));
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		socket.user = decoded;
		next();
	} catch (error) {
		next(new Error("Authentication error: Invalid token"));
	}
});

// Store connected users: userId -> socketId
const connectedUsers = new Map();

// Socket.IO connection handler
io.on("connection", (socket) => {
	const userId = socket.user.user_id;
	console.log(`User ${userId} connected: ${socket.id}`);

	// Store user's socket ID
	connectedUsers.set(userId, socket.id);

	// Join user's personal room for direct messaging
	socket.join(`user_${userId}`);

	// Handle sending messages
	socket.on("send_message", async (data) => {
		try {
			const { receiver_id, message } = data;

			if (!receiver_id || !message || !message.trim()) {
				socket.emit("error", { message: "Invalid message data" });
				return;
			}

			// Check authorization (similar to message controller)
			const { Message, User, OJTHead, OJTCoordinator, StudentTrainee, StudentInternship, SemestralInternshipListing, Sequelize } = db;
			const Op = Sequelize.Op;
			const receiverUser = await User.findByPk(receiver_id);
			if (!receiverUser) {
				socket.emit("error", { message: "Receiver not found" });
				return;
			}

			const userRole = socket.user.role;
			let canChat = false;

			if (userRole === "ojt-coordinator") {
				if (receiverUser.role === "ojt-head") {
					canChat = true;
				} else if (receiverUser.role === "student-trainee") {
					const coordinator = await OJTCoordinator.findOne({ where: { user_id: userId } });
					if (coordinator) {
						const listings = await SemestralInternshipListing.findAll({
							where: { ojt_coordinator_id: coordinator.ojt_coordinator_id },
						});
						if (listings.length > 0) {
							const listingIds = listings.map((l) => l.semestral_internship_listing_id);
							const student = await StudentTrainee.findOne({ where: { user_id: receiver_id } });
							if (student) {
								const studentInternship = await StudentInternship.findOne({
									where: {
										student_trainee_id: student.student_trainee_id,
										semestral_internship_listing_id: { [Op.in]: listingIds },
									},
								});
								canChat = !!studentInternship;
							}
						}
					}
				}
			} else if (userRole === "ojt-head") {
				if (receiverUser.role === "ojt-coordinator" || receiverUser.role === "student-trainee") {
					canChat = true;
				}
			} else if (userRole === "student-trainee") {
				if (receiverUser.role === "ojt-head") {
					canChat = true;
				} else if (receiverUser.role === "ojt-coordinator") {
					const student = await StudentTrainee.findOne({ where: { user_id: userId } });
					if (student) {
						const studentInternship = await StudentInternship.findOne({
							where: { student_trainee_id: student.student_trainee_id },
							include: [{ model: SemestralInternshipListing }],
						});
						if (studentInternship?.semestral_internship_listing) {
							const listing = studentInternship.semestral_internship_listing;
							const coordinator = listing.ojt_coordinator || listing.OJTCoordinator;
							if (coordinator && coordinator.user_id === receiver_id) {
								canChat = true;
							}
						}
					}
				}
			}

			if (!canChat) {
				socket.emit("error", { message: "You don't have permission to chat with this user" });
				return;
			}

			// Create message in database
			const newMessage = await Message.create({
				sender_id: userId,
				receiver_id: receiver_id,
				message: message.trim(),
				is_read: false,
			});

			// Fetch message with sender info
			const messageWithSender = await Message.findByPk(newMessage.message_id, {
				include: [
					{
						model: User,
						as: "sender",
						attributes: ["user_id", "email"],
					},
					{
						model: User,
						as: "receiver",
						attributes: ["user_id", "email"],
					},
				],
			});

			// Emit to receiver if online
			const receiverSocketId = connectedUsers.get(receiver_id);
			if (receiverSocketId) {
				io.to(`user_${receiver_id}`).emit("new_message", messageWithSender);
			}

			// Confirm to sender
			socket.emit("message_sent", messageWithSender);
		} catch (error) {
			console.error("Error sending message:", error);
			socket.emit("error", { message: "Failed to send message" });
		}
	});

	// Handle marking messages as read
	socket.on("mark_read", async (data) => {
		try {
			const { partner_id } = data;
			if (!partner_id) return;

			await Message.update(
				{
					is_read: true,
					read_at: new Date(),
				},
				{
					where: {
						sender_id: partner_id,
						receiver_id: userId,
						is_read: false,
					},
				}
			);

			// Notify sender that messages were read
			const senderSocketId = connectedUsers.get(partner_id);
			if (senderSocketId) {
				io.to(`user_${partner_id}`).emit("messages_read", {
					reader_id: userId,
				});
			}
		} catch (error) {
			console.error("Error marking messages as read:", error);
		}
	});

	// Handle disconnection
	socket.on("disconnect", () => {
		console.log(`User ${userId} disconnected: ${socket.id}`);
		connectedUsers.delete(userId);
	});
});

// Make io accessible to routes if needed
app.set("io", io);

// Global error handler - must be after all routes
app.use((err, req, res, next) => {
	console.error("Global error handler:", err.name, err.code, err.message, req.path, req.method);
	
	// Multer errors
	if (err.name === "MulterError") {
		if (err.code === "LIMIT_FILE_SIZE") {
			return res.status(400).json({
				message: "File too large. Maximum size is 50MB.",
			});
		}
		
		// For other Multer errors, return JSON error
		return res.status(400).json({
			message: "File upload error: " + (err.message || "Unknown error"),
			code: err.code,
		});
	}
	
	// Other errors
	res.status(err.status || 500).json({
		message: err.message || "Internal Server Error",
		error: process.env.NODE_ENV === "development" ? err.stack : undefined,
	});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}.`);
	console.log(`Socket.IO server is ready.`);
});
