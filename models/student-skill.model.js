module.exports = (sequelize, Sequelize) => {
	const StudentSkill = sequelize.define(
		"student_skills",
		{
			student_skill_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			student_trainee_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			skill_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
		},
		{
			tableName: "student_skills",
			timestamps: true,
		}
	);
	return StudentSkill;
};
