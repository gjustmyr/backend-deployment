module.exports = (sequelize, Sequelize) => {
	const Department = sequelize.define(
		"departments",
		{
			department_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			department_name: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			department_abbv: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			department_dean: {
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
			tableName: "departments",
			timestamps: true,
		}
	);
	return Department;
};
