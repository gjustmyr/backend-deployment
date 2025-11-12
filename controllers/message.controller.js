const db = require("../models");
const { Message, User, OJTHead, OJTCoordinator, StudentTrainee, StudentInternship, SemestralInternshipListing } = db;
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

// Helper function to get user's role-specific info
const getUserRoleInfo = async (userId, role) => {
	switch (role) {
		case "ojt-head":
			const ojtHead = await OJTHead.findOne({ where: { user_id: userId } });
			return {
				id: ojtHead?.ojt_head_id,
				name: ojtHead ? `${ojtHead.first_name} ${ojtHead.middle_name || ""} ${ojtHead.last_name}`.trim() : null,
			};
		case "ojt-coordinator":
			const coordinator = await OJTCoordinator.findOne({ where: { user_id: userId } });
			return {
				id: coordinator?.ojt_coordinator_id,
				name: coordinator ? `${coordinator.first_name} ${coordinator.middle_name || ""} ${coordinator.last_name}`.trim() : null,
			};
		case "student-trainee":
			const student = await StudentTrainee.findOne({ where: { user_id: userId } });
			return {
				id: student?.student_trainee_id,
				name: student ? `${student.first_name} ${student.middle_name || ""} ${student.last_name}`.trim() : null,
			};
		default:
			return { id: null, name: null };
	}
};

// Check if coordinator can chat with student
const canCoordinatorChatWithStudent = async (coordinatorUserId, studentUserId) => {
	try {
		const coordinator = await OJTCoordinator.findOne({ where: { user_id: coordinatorUserId } });
		if (!coordinator) return false;

		const student = await StudentTrainee.findOne({ where: { user_id: studentUserId } });
		if (!student) return false;

		// Check if student is in any of the coordinator's sections
		const listings = await SemestralInternshipListing.findAll({
			where: { ojt_coordinator_id: coordinator.ojt_coordinator_id },
		});

		const listingIds = listings.map((l) => l.semestral_internship_listing_id);

		const studentInternship = await StudentInternship.findOne({
			where: {
				student_trainee_id: student.student_trainee_id,
				semestral_internship_listing_id: {
					[Op.in]: listingIds,
				},
			},
		});

		return !!studentInternship;
	} catch (error) {
		console.error("Error checking coordinator-student chat permission:", error);
		return false;
	}
};

// Get all conversations for the current user
exports.getConversations = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const userRole = req.user.role;

		// Get all unique conversation partners
		const sentMessages = await Message.findAll({
			where: { sender_id: userId },
			attributes: ["receiver_id"],
			group: ["receiver_id"],
			raw: true,
		});

		const receivedMessages = await Message.findAll({
			where: { receiver_id: userId },
			attributes: ["sender_id"],
			group: ["sender_id"],
			raw: true,
		});

		const partnerIds = new Set();
		sentMessages.forEach((m) => partnerIds.add(m.receiver_id));
		receivedMessages.forEach((m) => partnerIds.add(m.sender_id));

		const conversations = [];

		for (const partnerId of partnerIds) {
			// Check authorization based on role
			const partnerUser = await User.findByPk(partnerId);
			if (!partnerUser) continue;

			let canChat = false;

			if (userRole === "ojt-coordinator") {
				// Coordinators can chat with OJT heads and their students
				if (partnerUser.role === "ojt-head") {
					canChat = true;
				} else if (partnerUser.role === "student-trainee") {
					canChat = await canCoordinatorChatWithStudent(userId, partnerId);
				}
			} else if (userRole === "ojt-head") {
				// OJT heads can chat with coordinators and students
				if (partnerUser.role === "ojt-coordinator" || partnerUser.role === "student-trainee") {
					canChat = true;
				}
			} else if (userRole === "student-trainee") {
				// Students can chat with OJT heads and their coordinator
				if (partnerUser.role === "ojt-head") {
					canChat = true;
				} else if (partnerUser.role === "ojt-coordinator") {
					canChat = await canCoordinatorChatWithStudent(partnerId, userId);
				}
			}

			if (!canChat) continue;

			// Get last message
			const lastMessage = await Message.findOne({
				where: {
					[Op.or]: [
						{ sender_id: userId, receiver_id: partnerId },
						{ sender_id: partnerId, receiver_id: userId },
					],
				},
				order: [["createdAt", "DESC"]],
			});

			// Get unread count
			const unreadCount = await Message.count({
				where: {
					sender_id: partnerId,
					receiver_id: userId,
					is_read: false,
				},
			});

			// Get partner info
			const partnerRoleInfo = await getUserRoleInfo(partnerId, partnerUser.role);

			conversations.push({
				partner_id: partnerId,
				partner_name: partnerRoleInfo.name || partnerUser.email,
				partner_role: partnerUser.role,
				last_message: lastMessage ? {
					message: lastMessage.message,
					created_at: lastMessage.createdAt,
					is_sender: lastMessage.sender_id === userId,
				} : null,
				unread_count: unreadCount,
			});
		}

		// Sort by last message time
		conversations.sort((a, b) => {
			if (!a.last_message) return 1;
			if (!b.last_message) return -1;
			return new Date(b.last_message.created_at) - new Date(a.last_message.created_at);
		});

		return res.status(200).json({
			message: "Conversations retrieved successfully",
			data: conversations,
		});
	} catch (error) {
		console.error("Error fetching conversations:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Get messages for a specific conversation
exports.getMessages = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const partnerId = parseInt(req.params.partnerId);

		if (!partnerId) {
			return res.status(400).json({ message: "Partner ID is required" });
		}

		// Check authorization
		const partnerUser = await User.findByPk(partnerId);
		if (!partnerUser) {
			return res.status(404).json({ message: "User not found" });
		}

		const userRole = req.user.role;
		let canChat = false;

		if (userRole === "ojt-coordinator") {
			if (partnerUser.role === "ojt-head") {
				canChat = true;
			} else if (partnerUser.role === "student-trainee") {
				canChat = await canCoordinatorChatWithStudent(userId, partnerId);
			}
		} else if (userRole === "ojt-head") {
			if (partnerUser.role === "ojt-coordinator" || partnerUser.role === "student-trainee") {
				canChat = true;
			}
		} else if (userRole === "student-trainee") {
			if (partnerUser.role === "ojt-head") {
				canChat = true;
			} else if (partnerUser.role === "ojt-coordinator") {
				canChat = await canCoordinatorChatWithStudent(partnerId, userId);
			}
		}

		if (!canChat) {
			return res.status(403).json({ message: "You don't have permission to chat with this user" });
		}

		// Get messages
		const messages = await Message.findAll({
			where: {
				[Op.or]: [
					{ sender_id: userId, receiver_id: partnerId },
					{ sender_id: partnerId, receiver_id: userId },
				],
			},
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
			order: [["createdAt", "ASC"]],
		});

		// Mark messages as read
		await Message.update(
			{
				is_read: true,
				read_at: new Date(),
			},
			{
				where: {
					sender_id: partnerId,
					receiver_id: userId,
					is_read: false,
				},
			}
		);

		return res.status(200).json({
			message: "Messages retrieved successfully",
			data: messages,
		});
	} catch (error) {
		console.error("Error fetching messages:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Get available chat partners based on role
exports.getChatPartners = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const userRole = req.user.role;

		const partners = [];

		if (userRole === "ojt-coordinator") {
			// Get OJT head
			const coordinator = await OJTCoordinator.findOne({ where: { user_id: userId } });
			if (coordinator) {
				const ojtHead = await OJTHead.findByPk(coordinator.ojt_head_id);
				if (ojtHead) {
					const headUser = await User.findByPk(ojtHead.user_id);
					if (headUser) {
						partners.push({
							user_id: headUser.user_id,
							name: `${ojtHead.first_name} ${ojtHead.middle_name || ""} ${ojtHead.last_name}`.trim(),
							role: "ojt-head",
						});
					}
				}
			}

			// Get students in coordinator's sections
			const listings = await SemestralInternshipListing.findAll({
				where: { ojt_coordinator_id: coordinator?.ojt_coordinator_id },
			});

			const listingIds = listings.map((l) => l.semestral_internship_listing_id);

			const studentInternships = await StudentInternship.findAll({
				where: { semestral_internship_listing_id: { [Op.in]: listingIds } },
				include: [
					{
						model: StudentTrainee,
						attributes: ["student_trainee_id", "first_name", "middle_name", "last_name", "user_id"],
					},
				],
			});

			const studentIds = new Set();
			studentInternships.forEach((si) => {
				if (si.student_trainee?.user_id) {
					studentIds.add(si.student_trainee.user_id);
				}
			});

			for (const studentUserId of studentIds) {
				const student = await StudentTrainee.findOne({ where: { user_id: studentUserId } });
				if (student) {
					partners.push({
						user_id: studentUserId,
						name: `${student.first_name} ${student.middle_name || ""} ${student.last_name}`.trim(),
						role: "student-trainee",
					});
				}
			}
		} else if (userRole === "ojt-head") {
			// Get all coordinators
			const coordinators = await OJTCoordinator.findAll();
			for (const coordinator of coordinators) {
				const coordinatorUser = await User.findByPk(coordinator.user_id);
				if (coordinatorUser && coordinatorUser.status === "enabled") {
					partners.push({
						user_id: coordinator.user_id,
						name: `${coordinator.first_name} ${coordinator.middle_name || ""} ${coordinator.last_name}`.trim(),
						role: "ojt-coordinator",
					});
				}
			}

			// Get all students
			const students = await StudentTrainee.findAll();
			for (const student of students) {
				const studentUser = await User.findByPk(student.user_id);
				if (studentUser && studentUser.status === "enabled") {
					partners.push({
						user_id: student.user_id,
						name: `${student.first_name} ${student.middle_name || ""} ${student.last_name}`.trim(),
						role: "student-trainee",
					});
				}
			}
		} else if (userRole === "student-trainee") {
			// Get student info
			const student = await StudentTrainee.findOne({ where: { user_id: userId } });
			if (student) {
				// Get student's internship to find coordinator
				const studentInternship = await StudentInternship.findOne({
					where: { student_trainee_id: student.student_trainee_id },
					include: [
						{
							model: SemestralInternshipListing,
							include: [
								{
									model: OJTCoordinator,
								},
							],
						},
					],
				});

				if (studentInternship?.semestral_internship_listing) {
					const listing = studentInternship.semestral_internship_listing;
					const coordinator = listing.ojt_coordinator || listing.OJTCoordinator;
					
					if (coordinator) {
						const coordinatorUser = await User.findByPk(coordinator.user_id);
						if (coordinatorUser) {
							partners.push({
								user_id: coordinator.user_id,
								name: `${coordinator.first_name} ${coordinator.middle_name || ""} ${coordinator.last_name}`.trim(),
								role: "ojt-coordinator",
							});
						}

						// Get OJT head from coordinator
						const ojtHead = await OJTHead.findByPk(coordinator.ojt_head_id);
						if (ojtHead) {
							const headUser = await User.findByPk(ojtHead.user_id);
							if (headUser) {
								// Check if already added
								const exists = partners.find((p) => p.user_id === headUser.user_id);
								if (!exists) {
									partners.push({
										user_id: headUser.user_id,
										name: `${ojtHead.first_name} ${ojtHead.middle_name || ""} ${ojtHead.last_name}`.trim(),
										role: "ojt-head",
									});
								}
							}
						}
					}
				}
			}
		}

		return res.status(200).json({
			message: "Chat partners retrieved successfully",
			data: partners,
		});
	} catch (error) {
		console.error("Error fetching chat partners:", error);
		return res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

