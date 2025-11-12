module.exports = (sequelize, Sequelize) => {
	const MOA = sequelize.define(
		"moas",
		{
			moa_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			employer_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				unique: true,
			},
			document_url: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			signed_date: {
				type: Sequelize.DATE,
				allowNull: false,
			},
			expiration_date: {
				type: Sequelize.DATE,
				allowNull: false,
			},
			status: {
				type: Sequelize.ENUM("active", "expired", "terminated"),
				defaultValue: "active",
				allowNull: false,
			},
		},
		{
			tableName: "moas",
			timestamps: true,
		}
	);
	return MOA;
};
