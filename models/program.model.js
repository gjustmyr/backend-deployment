const { program } = require(".");

module.exports = (sequelize, Sequelize) => {
	const Program = sequelize.define(
		"programs",
		{
			program_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			program_name: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			program_abbv: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			status: {
				type: Sequelize.ENUM("enabled", "disabled"),
				defaultValue: "enabled",
				allowNull: false,
			},
			department_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
		},
		{
			tableName: "programs",
			timestamps: true,
		}
	);
	return Program;
};
