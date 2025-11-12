module.exports = (sequelize, Sequelize) => {
	const StudentTrainee = sequelize.define(
		"student_trainees",
		{
			student_trainee_id: {
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
			prefix_name: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			suffix_name: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			about: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			age: {
				type: Sequelize.INTEGER,
				validate: { min: 0 },
				allowNull: true,
			},
			sex: {
				type: Sequelize.ENUM("male", "female"),
				allowNull: false,
			},
			height: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			weight: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			complexion: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			birthday: {
				type: Sequelize.DATEONLY,
				allowNull: true,
			},
			birthplace: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			citizenship: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			civil_status: {
				type: Sequelize.ENUM("single", "married", "widowed", "separated"),
				allowNull: false,
			},
			street_address: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			barangay_address: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			city_address: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			province_address: {
				type: Sequelize.STRING,
				allowNull: true,
			},

			user_id: {
				type: Sequelize.INTEGER,
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
			tableName: "student_trainees",
			timestamps: true,
		}
	);

	return StudentTrainee;
};
