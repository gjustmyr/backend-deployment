const { major } = require(".");

module.exports = (sequelize, Sequelize) => {
	const Major = sequelize.define(
		"majors",
		{
			major_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			major_name: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			major_abbv: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			status: {
				type: Sequelize.ENUM("enabled", "disabled"),
				defaultValue: "enabled",
				allowNull: false,
			},
		},
		{
			tableName: "majors",
			timestamps: true,
		}
	);
	return Major;
};
