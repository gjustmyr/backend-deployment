module.exports = (sequelize, Sequelize) => {
	const Supervisor = sequelize.define(
		"supervisors",
		{
			supervisor_id: {
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
			employer_id: {
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
			tableName: "supervisors",
			timestamps: true,
		}
	);
	return Supervisor;
};
