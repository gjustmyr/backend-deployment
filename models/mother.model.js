module.exports = (sequelize, Sequelize) => {
	const Mother = sequelize.define(
		"mothers",
		{
			mother_id: {
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
				unique: true,
			},
		},
		{
			tableName: "mothers",
			timestamps: true,
		}
	);

	return Mother;
};
