module.exports = (sequelize, Sequelize) => {
	const AlumniRequirementSubmission = sequelize.define(
		"alumni_requirement_submissions",
		{
			alumni_requirement_submission_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			job_requirement_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			job_application_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			alumni_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			document_url: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			status: {
				type: Sequelize.ENUM("submitted", "approved", "rejected"),
				defaultValue: "submitted",
				allowNull: false,
			},
			remarks: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			reviewed_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
		},
		{
			tableName: "alumni_requirement_submissions",
			timestamps: true,
		}
	);

	return AlumniRequirementSubmission;
};

