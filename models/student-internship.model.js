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
		},
		{
			tableName: "student_internships",
			timestamps: true,
		}
	);
	return StudentInternship;
};
