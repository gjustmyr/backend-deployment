const { department } = require(".");

module.exports = (sequelize, Sequelize) => {
	const OJTCoordinator = sequelize.define(
		"ojt_coordinators",
		{
			ojt_coordinator_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			first_name: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			middle_name: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			last_name: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			user_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				unique: true,
			},
			ojt_head_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			department_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			status: {
				type: Sequelize.ENUM("enabled", "disabled"),
				defaultValue: "enabled",
				allowNull: false,
			},
		},
		{
			tableName: "ojt_coordinators",
			timestamps: true,
		}
	);
	return OJTCoordinator;
};
