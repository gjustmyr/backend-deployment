module.exports = (sequelize, Sequelize) => {
	const Skill = sequelize.define(
		"skills",
		{
			skill_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			skill_name: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			skill_description: {
				type: Sequelize.STRING,
				allowNull: true,
			},
		},
		{
			tableName: "skills",
			timestamps: true,
		}
	);
	return Skill;
};
