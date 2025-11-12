module.exports = (sequelize, Sequelize) => {
	const Guardian = sequelize.define(
		"guardians",
		{
			guardian_id: {
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
			full_address: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			relationship: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			tel_no: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			student_trainee_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				unique: true,
			},
		},
		{
			tableName: "guardians",
			timestamps: true,
		}
	);

	return Guardian;
};
