const { program } = require(".");

module.exports = (sequelize, Sequelize) => {
	const section = sequelize.define(
		"sections",
		{
			section_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			section_name: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			year_level: {
				type: Sequelize.ENUM("1st Year", "2nd Year", "3rd Year", "4th Year"),
				allowNull: false,
			},
			semestral: {
				type: Sequelize.ENUM("1st Semester", "2nd Semester", "Midterm"),
				allowNull: false,
			},
			status: {
				type: Sequelize.ENUM("enabled", "disabled"),
				defaultValue: "enabled",
				allowNull: false,
			},
			program_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			major_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
		},
		{
			tableName: "sections",
			timestamps: true,
		}
	);
	return section;
};
