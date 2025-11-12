module.exports = (sequelize, Sequelize) => {
	const JobApplication = sequelize.define(
		"job_applications",
		{
			job_application_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			internship_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			alumni_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			status: {
				type: Sequelize.ENUM(
					"applied",
					"under_review",
					"requirements_pending",
					"interview",
					"hired",
					"rejected"
				),
				defaultValue: "applied",
				allowNull: false,
			},
			cover_letter: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			notes: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			resume_url: {
				type: Sequelize.STRING,
				allowNull: true,
			},
		},
		{
			tableName: "job_applications",
			timestamps: true,
		}
	);

	return JobApplication;
};

