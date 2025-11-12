module.exports = (sequelize, Sequelize) => {
	const InternshipSkill = sequelize.define(
		"internship_skills",
		{
			internship_skill_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			internship_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			skill_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
		},
		{
			tableName: "internship_skills",
			timestamps: true,
		}
	);
	return InternshipSkill;
};
