module.exports = (sequelize, Sequelize) => {
	const StudentInternship = sequelize.define(
		"student_internships",
		{
			student_internship_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			student_trainee_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			semestral_internship_listing_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			supervisor_id: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},

			raw_grade: {
				type: Sequelize.FLOAT,
				allowNull: true,
			},
			ojt_hours: {
				type: Sequelize.FLOAT,
				allowNull: true,
				defaultValue: 0,
				comment: "Total OJT hours accomplished by the student",
			},
			status: {
				type: Sequelize.ENUM(
					"application_seen",
					"hired",
					"starting",
					"pre-ojt",
					"ongoing",
					"completed",
					"dropped",
					"post-ojt",
					"graded"
				),
				defaultValue: "application_seen",
				allowNull: false,
			},
			appraisal_report_url: {
				type: Sequelize.STRING,
				allowNull: true,
				comment: "Supervisor uploaded appraisal report",
			},
			appraisal_submitted_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			supervisor_marked_done_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
		},
		{
			tableName: "student_internships",
			timestamps: true,
		}
	);
	return StudentInternship;
};
