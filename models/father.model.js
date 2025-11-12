module.exports = (sequelize, Sequelize) => {
	const Father = sequelize.define(
		"fathers",
		{
			father_id: {
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
			occupation: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			student_trainee_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				unique: true, // one father per student
			},
		},
		{
			tableName: "fathers",
			timestamps: true,
		}
	);

	return Father;
};
