module.exports = (sequelize, Sequelize) => {
	const StudentRequirement = sequelize.define(
		"student_requirements",
		{
			student_requirement_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			student_internship_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			ojt_requirement_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			submitted_document_url: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			status: {
				type: Sequelize.ENUM(
					"not_complied",
					"complied",
					"approved",
					"need_for_resubmission"
				),
				defaultValue: "not_complied",
				allowNull: false,
			},
			remarks: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			reviewed_by: {
				type: Sequelize.INTEGER,
				allowNull: true,
				comment: "OJT Coordinator ID who reviewed this requirement",
			},
			reviewed_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
		},
		{
			tableName: "student_requirements",
			timestamps: true,
		}
	);
	return StudentRequirement;
};

