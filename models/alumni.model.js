module.exports = (sequelize, Sequelize) => {
	const Alumni = sequelize.define(
		"alumni",
		{
			alumni_id: {
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
			contact_number: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			current_position: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			company_name: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			linked_in_url: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			resume_url: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			user_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				unique: true,
			},
			verified_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
		},
		{
			tableName: "alumni",
			timestamps: true,
		}
	);

	return Alumni;
};

