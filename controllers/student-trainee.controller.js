const db = require("../models");
const { StudentTrainee, User, StudentSkill, Skill } = db;

// Get current student trainee profile
exports.getCurrentProfile = async (req, res) => {
	try {
		const studentTrainee = await StudentTrainee.findOne({
			where: { user_id: req.user.user_id },
			include: [
				{
					model: User,
					attributes: ["user_id", "email", "role", "profile_picture"],
				},
				{
					model: StudentSkill,
					include: [
						{
							model: Skill,
							attributes: ["skill_id", "skill_name", "skill_description"],
						},
					],
				},
			],
		});

		if (!studentTrainee) {
			return res.status(404).json({ message: "Student trainee profile not found" });
		}

		res.status(200).json({
			message: "Profile fetched successfully",
			data: studentTrainee,
		});
	} catch (error) {
		console.error("Error fetching student trainee profile:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

// Update current student trainee profile
exports.updateCurrentProfile = async (req, res) => {
	try {
		const studentTrainee = await StudentTrainee.findOne({
			where: { user_id: req.user.user_id },
			include: [{ model: User }],
		});

		if (!studentTrainee) {
			return res.status(404).json({ message: "Student trainee profile not found" });
		}

		const {
			first_name,
			middle_name,
			last_name,
			prefix_name,
			suffix_name,
			about,
			age,
			sex,
			height,
			weight,
			complexion,
			birthday,
			birthplace,
			citizenship,
			civil_status,
			street_address,
			barangay_address,
			city_address,
			province_address,
			skill_ids,
		} = req.body;

		// Update student trainee fields
		await studentTrainee.update({
			first_name: first_name !== undefined ? first_name : studentTrainee.first_name,
			middle_name: middle_name !== undefined ? middle_name : studentTrainee.middle_name,
			last_name: last_name !== undefined ? last_name : studentTrainee.last_name,
			prefix_name: prefix_name !== undefined ? prefix_name : studentTrainee.prefix_name,
			suffix_name: suffix_name !== undefined ? suffix_name : studentTrainee.suffix_name,
			about: about !== undefined ? about : studentTrainee.about,
			age: age !== undefined ? age : studentTrainee.age,
			sex: sex !== undefined ? sex : studentTrainee.sex,
			height: height !== undefined ? height : studentTrainee.height,
			weight: weight !== undefined ? weight : studentTrainee.weight,
			complexion: complexion !== undefined ? complexion : studentTrainee.complexion,
			birthday: birthday !== undefined ? birthday : studentTrainee.birthday,
			birthplace: birthplace !== undefined ? birthplace : studentTrainee.birthplace,
			citizenship: citizenship !== undefined ? citizenship : studentTrainee.citizenship,
			civil_status: civil_status !== undefined ? civil_status : studentTrainee.civil_status,
			street_address: street_address !== undefined ? street_address : studentTrainee.street_address,
			barangay_address: barangay_address !== undefined ? barangay_address : studentTrainee.barangay_address,
			city_address: city_address !== undefined ? city_address : studentTrainee.city_address,
			province_address: province_address !== undefined ? province_address : studentTrainee.province_address,
		});

		// Update user profile picture if provided
		if (req.file?.path) {
			await User.update(
				{ profile_picture: req.file.path },
				{ where: { user_id: req.user.user_id } }
			);
		}

		// Handle skills update if provided
		// FormData with skill_ids[] will be parsed as an array by multer
		if (skill_ids !== undefined) {
			// Delete existing student skills
			await StudentSkill.destroy({
				where: { student_trainee_id: studentTrainee.student_trainee_id },
			});

			// Handle different formats: array, string (JSON or comma-separated), or single value
			let parsedSkillIds = skill_ids;
			if (!Array.isArray(skill_ids)) {
				if (typeof skill_ids === "string") {
					try {
						parsedSkillIds = JSON.parse(skill_ids);
					} catch (e) {
						// If parsing fails, treat as comma-separated
						parsedSkillIds = skill_ids.split(",").map(id => id.trim()).filter(Boolean);
					}
				} else {
					// Single value
					parsedSkillIds = [skill_ids];
				}
			}

			// Add new skills if provided
			if (Array.isArray(parsedSkillIds) && parsedSkillIds.length > 0) {
				const validSkillIds = parsedSkillIds.filter(id => id && !isNaN(parseInt(id)));
				if (validSkillIds.length > 0) {
					await Promise.all(
						validSkillIds.map(skill_id =>
							StudentSkill.create({
								student_trainee_id: studentTrainee.student_trainee_id,
								skill_id: parseInt(skill_id),
							})
						)
					);
				}
			}
		}

		// Fetch updated student trainee with all relationships
		const updatedStudentTrainee = await StudentTrainee.findByPk(studentTrainee.student_trainee_id, {
			include: [
				{
					model: User,
					attributes: ["user_id", "email", "role", "profile_picture"],
				},
				{
					model: StudentSkill,
					include: [
						{
							model: Skill,
							attributes: ["skill_id", "skill_name", "skill_description"],
						},
					],
				},
			],
		});

		res.status(200).json({
			message: "Profile updated successfully",
			data: updatedStudentTrainee,
		});
	} catch (error) {
		console.error("Error updating student trainee profile:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};

