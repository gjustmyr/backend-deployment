module.exports = (sequelize, Sequelize) => {
	const SemestralInternship = sequelize.define(
		"semestral_internships",
		{
			semestral_internship_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			semestral: {
				type: Sequelize.ENUM("1st Semester", "2nd Semester", "Midterm"),
				allowNull: false,
			},
			academic_year: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			status: {
				type: Sequelize.ENUM("opened", "closed"),
				defaultValue: "opened",
				allowNull: false,
			},
		},
		{
			tableName: "semestral_internships",
			timestamps: true,
		}
	);
	return SemestralInternship;
};
