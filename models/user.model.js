module.exports = (sequelize, Sequelize) => {
	const User = sequelize.define(
		"users",
		{
			user_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			email: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			password: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			profile_picture: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			role: {
				type: Sequelize.ENUM(
					"superadmin",
					"ojt-head",
					"ojt-coordinator",
					"student-trainee",
					"employer",
					"supervisor",
					"job-placement-head",
					"alumni"
				),
				defaultValue: "student-trainee",
				allowNull: false,
			},
			is_password_reset: {
				type: Sequelize.BOOLEAN,
				defaultValue: false,
				allowNull: false,
			},
			status: {
				type: Sequelize.ENUM("enabled", "disabled"),
				defaultValue: "enabled",
				allowNull: false,
			},
		},
		{
			tableName: "users",
			timestamps: true,
		}
	);
	return User;
};
